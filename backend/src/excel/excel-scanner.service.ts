import fs from "node:fs";
import path from "node:path";
import { SUPPORTED_EXCEL_EXTENSIONS } from "../constants/operational-data.constants";
import { ValidationError } from "../errors";

export class ExcelScannerService {
  scanFolder(folder: string): string[] {
    const normalized = folder.trim();
    if (!normalized) {
      throw new ValidationError("folder is required.");
    }
    if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) {
      throw new ValidationError("Folder not found.");
    }

    return fs
      .readdirSync(normalized, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) =>
        SUPPORTED_EXCEL_EXTENSIONS.includes(path.extname(name).toLowerCase() as (typeof SUPPORTED_EXCEL_EXTENSIONS)[number])
      )
      .sort((left, right) => left.localeCompare(right));
  }
}

