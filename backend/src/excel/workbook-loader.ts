import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { SUPPORTED_EXCEL_EXTENSIONS } from "../constants/operational-data.constants";
import { ValidationError } from "../errors";
import type { WorkbookLoader } from "../interfaces/excel-sync.interface";

export class ExcelWorkbookLoader implements WorkbookLoader {
  loadWorkbook(filePath: string): XLSX.WorkBook {
    if (typeof filePath !== "string" || filePath.trim().length === 0) {
      throw new ValidationError("Operational Excel files not found.");
    }

    const absolutePath = path.resolve(filePath);
    const ext = path.extname(absolutePath).toLowerCase();
    if (!SUPPORTED_EXCEL_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXCEL_EXTENSIONS)[number])) {
      throw new ValidationError("Unsupported Excel format.");
    }
    if (!fs.existsSync(absolutePath)) {
      throw new ValidationError("Workbook not found.");
    }

    try {
      return XLSX.readFile(absolutePath, { cellDates: true });
    } catch {
      throw new ValidationError("Workbook not readable.");
    }
  }
}
