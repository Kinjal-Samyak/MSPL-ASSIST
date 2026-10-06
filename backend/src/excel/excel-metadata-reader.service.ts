import fs from "node:fs";
import { createHash } from "node:crypto";
import { ValidationError } from "../errors";
import { ExcelWorkbookLoader } from "./workbook-loader";

export class ExcelMetadataReaderService {
  constructor(private readonly workbookLoader: ExcelWorkbookLoader = new ExcelWorkbookLoader()) {}

  listWorksheets(filePath: string): string[] {
    const workbook = this.workbookLoader.loadWorkbook(filePath);
    if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
      throw new ValidationError("Workbook has no worksheets.");
    }
    return workbook.SheetNames;
  }

  computeWorkbookHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath);
      return createHash("sha256").update(content).digest("hex");
    } catch {
      throw new ValidationError("Workbook not readable.");
    }
  }
}

