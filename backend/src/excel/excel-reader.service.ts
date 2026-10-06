import type { ParsedExcelRowDto } from "../dto/excel-sync.dto";
import type { ExcelReader, SheetParser, WorkbookLoader } from "../interfaces/excel-sync.interface";
import { ExcelSheetParser } from "./sheet-parser";
import { ExcelWorkbookLoader } from "./workbook-loader";

export class ExcelReaderService implements ExcelReader {
  constructor(
    private readonly workbookLoader: WorkbookLoader = new ExcelWorkbookLoader(),
    private readonly sheetParser: SheetParser = new ExcelSheetParser()
  ) {}

  readRows(filePath: string, sheetName: string): ParsedExcelRowDto[] {
    const workbook = this.workbookLoader.loadWorkbook(filePath);
    return this.sheetParser.parseRows(workbook, sheetName);
  }
}
