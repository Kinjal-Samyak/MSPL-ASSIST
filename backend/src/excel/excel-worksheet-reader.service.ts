import * as XLSX from "xlsx";
import { ValidationError } from "../errors";
import { ExcelWorkbookLoader } from "./workbook-loader";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function hasNonEmptyCell(row: unknown[]): boolean {
  return row.some((cell) => String(cell ?? "").trim().length > 0);
}

function detectHeaderRow(rows: unknown[][]): unknown[] {
  const firstPopulated = rows.find((row) => Array.isArray(row) && hasNonEmptyCell(row));
  if (!firstPopulated) {
    throw new ValidationError("Worksheet empty.");
  }
  return firstPopulated;
}

export class ExcelWorksheetReaderService {
  constructor(private readonly workbookLoader: ExcelWorkbookLoader = new ExcelWorkbookLoader()) {}

  readHeaders(filePath: string, worksheetName: string): string[] {
    const workbook = this.workbookLoader.loadWorkbook(filePath);
    const worksheet = workbook.Sheets[worksheetName];
    if (!worksheet) {
      throw new ValidationError("Worksheet not found.");
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    const headerRow = detectHeaderRow(rows);
    const headers = headerRow
      .map((item) => normalizeHeader(item))
      .filter((item) => item.length > 0);
    if (headers.length === 0) {
      throw new ValidationError("Worksheet empty.");
    }
    return headers;
  }

  ensureWorksheetNotEmpty(filePath: string, worksheetName: string): void {
    const workbook = this.workbookLoader.loadWorkbook(filePath);
    const worksheet = workbook.Sheets[worksheetName];
    if (!worksheet) {
      throw new ValidationError("Worksheet not found.");
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    const hasAnyData = rows.some((row) => Array.isArray(row) && hasNonEmptyCell(row));
    if (!hasAnyData) {
      throw new ValidationError("Worksheet empty.");
    }
  }
}
