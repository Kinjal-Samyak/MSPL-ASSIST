import * as XLSX from "xlsx";
import { ValidationError } from "../errors";
import type { ParsedExcelRowDto } from "../dto/excel-sync.dto";
import type { SheetParser } from "../interfaces/excel-sync.interface";
import { normalizeHeader, resolveHeaderRow } from "./excel-header-normalizer";

const HEADER_SCAN_LIMIT = 30;

function buildUniqueHeaders(rawHeaders: unknown[]): string[] {
  const occurrences = new Map<string, number>();
  return rawHeaders.map((value, index) => {
    const normalized = normalizeHeader(value) || `column ${index + 1}`;
    const occurrence = (occurrences.get(normalized) ?? 0) + 1;
    occurrences.set(normalized, occurrence);
    return occurrence === 1 ? normalized : `${normalized} ${occurrence}`;
  });
}

function parseRow(headers: string[], rawRow: unknown[], rowNumber: number): ParsedExcelRowDto {
  const values: Record<string, unknown> = {};
  headers.forEach((header, columnIndex) => {
    values[header] = rawRow[columnIndex] ?? null;
  });
  return { rowNumber, values };
}

export class ExcelSheetParser implements SheetParser {
  parseRows(workbook: unknown, sheetName: string): ParsedExcelRowDto[] {
    const typedWorkbook = workbook as XLSX.WorkBook;
    if (!typedWorkbook?.Sheets || !Array.isArray(typedWorkbook.SheetNames)) {
      throw new ValidationError("Invalid workbook payload provided to sheet parser.");
    }

    const worksheet = typedWorkbook.Sheets[sheetName];
    if (!worksheet) {
      throw new ValidationError(`Sheet '${sheetName}' was not found in workbook.`);
    }

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: null,
      raw: true,
    });
    const resolution = resolveHeaderRow(rawRows, HEADER_SCAN_LIMIT);
    if (!resolution) {
      throw new ValidationError(`Unable to resolve a supported header row in sheet '${sheetName}'.`);
    }
    const headerIndex = resolution.headerRowIndex;

    const headers = buildUniqueHeaders(rawRows[headerIndex]);
    const parsed: ParsedExcelRowDto[] = [];
    for (let index = headerIndex + 1; index < rawRows.length; index += 1) {
      const rawRow = rawRows[index];
      parsed.push(parseRow(headers, rawRow, index + 1));
    }
    return parsed;
  }
}
