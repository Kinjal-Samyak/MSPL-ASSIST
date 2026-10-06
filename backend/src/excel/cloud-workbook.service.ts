import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { SUPPORTED_EXCEL_EXTENSIONS } from "../constants/operational-data.constants";
import { ValidationError } from "../errors";
import { GraphAuthService, graphAuthService } from "../services/graph-auth.service";

interface DownloadedWorkbook {
  url: string;
  workbookName: string;
  size: number;
  lastModified: string | null;
  buffer: Buffer;
}

export interface WorkbookMetadataResult {
  workbookUrl: string | null;
  workbookName: string;
  workbookSize: number;
  modifiedDate: string | null;
  worksheets: string[];
  autoSelectedWorksheet: string | null;
}

export interface DownloadedWorkbookFile {
  tempFilePath: string;
  workbookName: string;
  workbookHash: string;
  modifiedDate: string | null;
}

function parseWorkbookName(url: string): string {
  try {
    const parsed = new URL(url);
    const value = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    if (!value.trim()) {
      throw new ValidationError("Workbook URL must include a workbook filename.");
    }
    return value;
  } catch {
    throw new ValidationError("Workbook URL is invalid.");
  }
}

function extensionOf(workbookName: string): string {
  return path.extname(workbookName).toLowerCase();
}

function isSupportedWorkbook(workbookName: string): boolean {
  const ext = extensionOf(workbookName);
  return SUPPORTED_EXCEL_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXCEL_EXTENSIONS)[number]);
}

function readWorkbook(buffer: Buffer): XLSX.WorkBook {
  try {
    return XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new ValidationError("Invalid workbook.");
  }
}

function listWorksheetNames(workbook: XLSX.WorkBook): string[] {
  if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
    throw new ValidationError("Workbook has no worksheets.");
  }
  return workbook.SheetNames;
}

function toHash(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasNonEmptyCell(row: unknown[]): boolean {
  return row.some((cell) => String(cell ?? "").trim().length > 0);
}

function resolveHeaderRow(rows: Array<Array<unknown>>, requestedHeaderRow: number): Array<unknown> {
  const requestedIndex = Math.max(requestedHeaderRow, 1) - 1;
  const requested = rows[requestedIndex];
  if (Array.isArray(requested) && hasNonEmptyCell(requested)) {
    return requested;
  }

  const detected = rows.find((row) => Array.isArray(row) && hasNonEmptyCell(row));
  if (!detected) {
    throw new ValidationError("Worksheet empty.");
  }
  return detected;
}

async function downloadWorkbook(url: string): Promise<DownloadedWorkbook> {
  const workbookName = parseWorkbookName(url);
  if (!isSupportedWorkbook(workbookName)) {
    throw new ValidationError("Unsupported Excel format.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/octet-stream",
      },
    });
  } catch {
    throw new ValidationError("Network error while accessing workbook URL.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new ValidationError("Permission denied while accessing workbook URL.");
  }
  if (response.status === 404) {
    throw new ValidationError("Workbook not found.");
  }
  if (!response.ok) {
    throw new ValidationError("Workbook URL is not accessible.");
  }

  let payload: Buffer;
  try {
    const arrayBuffer = await response.arrayBuffer();
    payload = Buffer.from(arrayBuffer);
  } catch {
    throw new ValidationError("Workbook not readable.");
  }
  if (payload.length === 0) {
    throw new ValidationError("Workbook not readable.");
  }

  const modified = response.headers.get("last-modified");
  const modifiedDate = modified ? new Date(modified).toISOString() : null;

  return {
    url,
    workbookName,
    size: payload.length,
    lastModified: modifiedDate,
    buffer: payload,
  };
}

export class CloudWorkbookService {
  constructor(private readonly graphAuth: GraphAuthService = graphAuthService) {}

  private isCloudWorkbookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes("sharepoint.com") || parsed.hostname.includes("onedrive.live.com");
    } catch {
      return false;
    }
  }

  private async requestWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    timeoutMs = 20000
  ): Promise<Response> {
    let attempt = 0;
    let waitMs = 500;
    while (attempt <= retries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.status === 429 || response.status >= 500) {
          if (attempt === retries) {
            return response;
          }
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          const delayMs = retryAfter > 0 ? retryAfter * 1000 : waitMs;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt += 1;
          waitMs *= 2;
          continue;
        }
        return response;
      } catch (error) {
        clearTimeout(timeout);
        if (attempt === retries) {
          if (error instanceof Error && error.name === "AbortError") {
            throw new ValidationError("Microsoft Graph timeout while accessing workbook.");
          }
          throw new ValidationError("Network error while accessing workbook URL.");
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        attempt += 1;
        waitMs *= 2;
      }
    }
    throw new ValidationError("Network error while accessing workbook URL.");
  }

  private async parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch {
      throw new ValidationError(fallbackError);
    }
  }

  private async ensureGraphAccess(response: Response): Promise<void> {
    if (response.status === 401 || response.status === 403) {
      await this.graphAuth.invalidateAuth("Microsoft Graph token expired or permission was revoked.");
      throw new ValidationError("Microsoft Graph authentication expired. Please reconnect.");
    }
  }

  private async downloadFromGraph(url: string): Promise<DownloadedWorkbook> {
    const accessToken = await this.graphAuth.getAccessToken();
    const shareId = this.graphAuth.toGraphShareId(url);
    const metadataUrl = `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem?$select=id,name,size,lastModifiedDateTime,eTag`;
    const metadataResponse = await this.requestWithRetry(metadataUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await this.ensureGraphAccess(metadataResponse);
    if (metadataResponse.status === 404) {
      throw new ValidationError("Workbook not found.");
    }
    if (!metadataResponse.ok) {
      throw new ValidationError("Permission denied while accessing workbook URL.");
    }

    const metadata = await this.parseJsonResponse<{
      name?: string;
      size?: number;
      lastModifiedDateTime?: string;
    }>(metadataResponse, "Workbook metadata is invalid.");

    const workbookName = typeof metadata.name === "string" ? metadata.name : parseWorkbookName(url);
    if (!isSupportedWorkbook(workbookName)) {
      throw new ValidationError("Unsupported Excel format.");
    }

    const contentUrl = `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem/content`;
    const contentResponse = await this.requestWithRetry(contentUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    await this.ensureGraphAccess(contentResponse);
    if (!contentResponse.ok) {
      throw new ValidationError("Workbook not readable.");
    }
    const arrayBuffer = await contentResponse.arrayBuffer();
    const payload = Buffer.from(arrayBuffer);
    if (payload.length === 0) {
      throw new ValidationError("Workbook not readable.");
    }
    return {
      url,
      workbookName,
      size: typeof metadata.size === "number" ? metadata.size : payload.length,
      lastModified: metadata.lastModifiedDateTime ?? null,
      buffer: payload,
    };
  }

  private async downloadPublicWorkbook(url: string): Promise<DownloadedWorkbook> {
    return downloadWorkbook(url);
  }

  private async downloadFromGraphDriveItem(driveId: string, itemId: string): Promise<DownloadedWorkbook> {
    const normalizedDriveId = driveId.trim();
    const normalizedItemId = itemId.trim();
    if (!normalizedDriveId || !normalizedItemId) {
      throw new ValidationError("Drive ID and item ID are required.");
    }

    const accessToken = await this.graphAuth.getAccessToken();
    const metadataUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      normalizedDriveId
    )}/items/${encodeURIComponent(normalizedItemId)}?$select=id,name,size,lastModifiedDateTime`;
    const metadataResponse = await this.requestWithRetry(metadataUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    await this.ensureGraphAccess(metadataResponse);
    if (metadataResponse.status === 404) {
      throw new ValidationError("Workbook not found.");
    }
    if (!metadataResponse.ok) {
      throw new ValidationError("Permission denied while accessing workbook.");
    }

    const metadata = await this.parseJsonResponse<{
      name?: string;
      size?: number;
      lastModifiedDateTime?: string;
    }>(metadataResponse, "Workbook metadata is invalid.");
    const workbookName = typeof metadata.name === "string" ? metadata.name.trim() : "";
    if (!workbookName) {
      throw new ValidationError("Workbook metadata is incomplete.");
    }
    if (!isSupportedWorkbook(workbookName)) {
      throw new ValidationError("Unsupported Excel format.");
    }

    const contentUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      normalizedDriveId
    )}/items/${encodeURIComponent(normalizedItemId)}/content`;
    const contentResponse = await this.requestWithRetry(contentUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    await this.ensureGraphAccess(contentResponse);
    if (!contentResponse.ok) {
      throw new ValidationError("Workbook not readable.");
    }
    const payload = Buffer.from(await contentResponse.arrayBuffer());
    if (payload.length === 0) {
      throw new ValidationError("Workbook not readable.");
    }

    return {
      url: "",
      workbookName,
      size: typeof metadata.size === "number" ? metadata.size : payload.length,
      lastModified: metadata.lastModifiedDateTime ?? null,
      buffer: payload,
    };
  }

  private async downloadWorkbook(url: string): Promise<DownloadedWorkbook> {
    if (this.isCloudWorkbookUrl(url)) {
      return this.downloadFromGraph(url);
    }
    return this.downloadPublicWorkbook(url);
  }

  async getWorkbookMetadata(url: string): Promise<WorkbookMetadataResult> {
    const downloaded = await this.downloadWorkbook(url);
    const workbook = readWorkbook(downloaded.buffer);
    const worksheets = listWorksheetNames(workbook);
    return {
      workbookUrl: downloaded.url,
      workbookName: downloaded.workbookName,
      workbookSize: downloaded.size,
      modifiedDate: downloaded.lastModified,
      worksheets,
      autoSelectedWorksheet: worksheets.length === 1 ? worksheets[0] : null,
    };
  }

  async getWorkbookMetadataByDriveItem(driveId: string, itemId: string): Promise<WorkbookMetadataResult> {
    const downloaded = await this.downloadFromGraphDriveItem(driveId, itemId);
    const workbook = readWorkbook(downloaded.buffer);
    const worksheets = listWorksheetNames(workbook);
    return {
      workbookUrl: null,
      workbookName: downloaded.workbookName,
      workbookSize: downloaded.size,
      modifiedDate: downloaded.lastModified,
      worksheets,
      autoSelectedWorksheet: worksheets.length === 1 ? worksheets[0] : null,
    };
  }

  async loadHeaders(url: string, worksheetName: string, headerRow = 1): Promise<string[]> {
    const normalizedWorksheet = worksheetName.trim();
    if (!normalizedWorksheet) {
      throw new ValidationError("Worksheet name is required.");
    }
    const downloaded = await this.downloadWorkbook(url);
    const workbook = readWorkbook(downloaded.buffer);
    const worksheet = workbook.Sheets[normalizedWorksheet];
    if (!worksheet) {
      throw new ValidationError("Worksheet not found.");
    }

    const rows = XLSX.utils.sheet_to_json<Array<unknown>>(worksheet, {
      header: 1,
      raw: false,
      blankrows: false,
    });
    const row = resolveHeaderRow(rows, headerRow);

    const headers = row
      .map((value) => (typeof value === "string" ? value.trim() : String(value ?? "").trim()))
      .filter((value) => value.length > 0);
    if (headers.length === 0) {
      throw new ValidationError("Worksheet empty.");
    }
    return headers;
  }

  async downloadToTempFile(url: string, prefix: string): Promise<DownloadedWorkbookFile> {
    const downloaded = await this.downloadWorkbook(url);
    const extension = extensionOf(downloaded.workbookName);
    const tempName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
    const tempFilePath = path.join(os.tmpdir(), tempName);
    fs.writeFileSync(tempFilePath, downloaded.buffer);
    return {
      tempFilePath,
      workbookName: downloaded.workbookName,
      workbookHash: toHash(downloaded.buffer),
      modifiedDate: downloaded.lastModified,
    };
  }

  async loadHeadersByDriveItem(
    driveId: string,
    itemId: string,
    worksheetName: string,
    headerRow = 1
  ): Promise<string[]> {
    const normalizedWorksheet = worksheetName.trim();
    if (!normalizedWorksheet) {
      throw new ValidationError("Worksheet name is required.");
    }
    const downloaded = await this.downloadFromGraphDriveItem(driveId, itemId);
    const workbook = readWorkbook(downloaded.buffer);
    const worksheet = workbook.Sheets[normalizedWorksheet];
    if (!worksheet) {
      throw new ValidationError("Worksheet not found.");
    }
    const rows = XLSX.utils.sheet_to_json<Array<unknown>>(worksheet, {
      header: 1,
      raw: false,
      blankrows: false,
    });
    const row = resolveHeaderRow(rows, headerRow);
    const headers = row
      .map((value) => (typeof value === "string" ? value.trim() : String(value ?? "").trim()))
      .filter((value) => value.length > 0);
    if (headers.length === 0) {
      throw new ValidationError("Worksheet empty.");
    }
    return headers;
  }

  async downloadToTempFileByDriveItem(driveId: string, itemId: string, prefix: string): Promise<DownloadedWorkbookFile> {
    const downloaded = await this.downloadFromGraphDriveItem(driveId, itemId);
    const extension = extensionOf(downloaded.workbookName);
    const tempName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
    const tempFilePath = path.join(os.tmpdir(), tempName);
    fs.writeFileSync(tempFilePath, downloaded.buffer);
    return {
      tempFilePath,
      workbookName: downloaded.workbookName,
      workbookHash: toHash(downloaded.buffer),
      modifiedDate: downloaded.lastModified,
    };
  }

  cleanupTempFile(tempFilePath: string): void {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
