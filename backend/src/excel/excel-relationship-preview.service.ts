import * as XLSX from "xlsx";
import { ValidationError } from "../errors";
import { ExcelColumnMapperService } from "./excel-column-mapper.service";

export interface RelationshipColumnProfile {
  totalRows: number;
  values: string[];
  duplicates: number;
}

export class ExcelRelationshipPreviewService {
  extractColumnValues(
    workbookPath: string,
    worksheetName: string,
    headerRow: number,
    columnName: string
  ): RelationshipColumnProfile {
    const workbook = XLSX.readFile(workbookPath, { cellDates: true });
    const worksheet = workbook.Sheets[worksheetName];
    if (!worksheet) {
      throw new ValidationError("Worksheet not found.");
    }
    const rows = XLSX.utils.sheet_to_json<Array<unknown>>(worksheet, { header: 1, raw: false, blankrows: false });
    const headerIndex = Math.max(headerRow, 1) - 1;
    const headerRowValues = rows[headerIndex];
    if (!Array.isArray(headerRowValues)) {
      throw new ValidationError("Worksheet empty.");
    }
    const headers = headerRowValues.map((value) => String(value ?? "").trim());
    const targetIndex = headers.findIndex(
      (entry) => ExcelColumnMapperService.normalizeHeader(entry) === ExcelColumnMapperService.normalizeHeader(columnName)
    );
    if (targetIndex < 0) {
      throw new ValidationError(`Required column missing: ${columnName}`);
    }

    const values: string[] = [];
    const dedupe = new Set<string>();
    let duplicates = 0;
    for (let index = headerIndex + 1; index < rows.length; index += 1) {
      const row = rows[index];
      if (!Array.isArray(row)) {
        continue;
      }
      const value = String(row[targetIndex] ?? "").trim();
      if (!value) {
        continue;
      }
      const normalized = value.toUpperCase();
      if (dedupe.has(normalized)) {
        duplicates += 1;
      } else {
        dedupe.add(normalized);
      }
      values.push(normalized);
    }

    return {
      totalRows: Math.max(rows.length - (headerIndex + 1), 0),
      values,
      duplicates,
    };
  }
}
