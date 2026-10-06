import type { BrowseOneDriveItemsResponseDto, OneDriveDriveDto, OneDriveItemDto } from "../dto/operational-data.dto";
import { ValidationError } from "../errors";
import { logger } from "../utils/logger";
import { GraphAuthService, graphAuthService } from "./graph-auth.service";

interface GraphListResponse<T> {
  value?: T[];
}

interface GraphDrive {
  id?: string;
  name?: string;
  driveType?: string;
  webUrl?: string;
}

interface GraphDriveItem {
  id?: string;
  name?: string;
  webUrl?: string;
  lastModifiedDateTime?: string;
  size?: number;
  folder?: Record<string, unknown>;
  file?: Record<string, unknown>;
}

const BROWSE_CACHE_TTL_MS = 30_000;

function isExcelWorkbook(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized.endsWith(".xlsx") || normalized.endsWith(".xlsm") || normalized.endsWith(".xls");
}

export class GraphFileService {
  private readonly browseCache = new Map<string, { expiresAt: number; value: BrowseOneDriveItemsResponseDto }>();
  constructor(private readonly graphAuth: GraphAuthService = graphAuthService) {}

  async listDrives(): Promise<OneDriveDriveDto[]> {
    const response = await this.requestGraph(
      "https://graph.microsoft.com/v1.0/me/drives?$select=id,name,driveType,webUrl"
    );
    const payload = (await response.json()) as GraphListResponse<GraphDrive>;
    const drives = (payload.value ?? [])
      .filter((drive): drive is GraphDrive & { id: string; name: string } => {
        return typeof drive.id === "string" && drive.id.length > 0 && typeof drive.name === "string" && drive.name.length > 0;
      })
      .map((drive) => ({
        id: drive.id,
        name: drive.name,
        driveType: typeof drive.driveType === "string" && drive.driveType.length > 0 ? drive.driveType : "documentLibrary",
        webUrl: typeof drive.webUrl === "string" ? drive.webUrl : null,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    return drives;
  }

  async browseItems(driveId: string, parentItemId?: string): Promise<BrowseOneDriveItemsResponseDto> {
    const scopedParentId = typeof parentItemId === "string" && parentItemId.trim().length > 0 ? parentItemId.trim() : null;
    const cacheKey = `${driveId}:${scopedParentId ?? "root"}`;
    const cached = this.browseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const endpoint = scopedParentId
      ? `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(scopedParentId)}/children?$select=id,name,webUrl,lastModifiedDateTime,size,file,folder&$top=200`
      : `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root/children?$select=id,name,webUrl,lastModifiedDateTime,size,file,folder&$top=200`;

    const response = await this.requestGraph(endpoint);
    const payload = (await response.json()) as GraphListResponse<GraphDriveItem>;
    const items = this.toBrowseItems(payload.value ?? []);

    const result = {
      driveId,
      parentItemId: scopedParentId,
      items,
    };
    this.browseCache.set(cacheKey, { value: result, expiresAt: Date.now() + BROWSE_CACHE_TTL_MS });
    return result;
  }

  private toBrowseItems(raw: GraphDriveItem[]): OneDriveItemDto[] {
    const mapped = raw
      .filter((entry): entry is GraphDriveItem & { id: string; name: string } => {
        return typeof entry.id === "string" && entry.id.length > 0 && typeof entry.name === "string" && entry.name.length > 0;
      })
      .flatMap((entry) => {
        const isFolder = entry.folder != null;
        const isWorkbook = entry.file != null && isExcelWorkbook(entry.name);
        if (!isFolder && !isWorkbook) {
          return [];
        }

        return [
          {
            id: entry.id,
            name: entry.name,
            type: isFolder ? "FOLDER" : "WORKBOOK",
            webUrl: typeof entry.webUrl === "string" ? entry.webUrl : null,
            lastModifiedDate: typeof entry.lastModifiedDateTime === "string" ? entry.lastModifiedDateTime : null,
            size: typeof entry.size === "number" ? entry.size : null,
          } satisfies OneDriveItemDto,
        ];
      });

    return mapped.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "FOLDER" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  }

  private async requestGraph(url: string): Promise<Response> {
    const accessToken = await this.graphAuth.getAccessToken();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401 || response.status === 403) {
      await this.graphAuth.invalidateAuth("Microsoft Graph token expired or permission was revoked.");
      throw new ValidationError("Microsoft Graph authentication expired. Please reconnect.");
    }

    if (!response.ok) {
      logger.error({
        scope: "graph-files",
        event: "Graph Browse Request Failed",
        status: response.status,
        url,
      });
      throw new ValidationError("Failed to browse OneDrive. Please try again.");
    }
    return response;
  }
}

export const graphFileService = new GraphFileService();
