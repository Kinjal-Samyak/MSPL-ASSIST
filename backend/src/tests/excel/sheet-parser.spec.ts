import * as XLSX from "xlsx";
import { ExcelSheetParser } from "../../excel/sheet-parser";

describe("ExcelSheetParser", () => {
  it("continues parsing when data resumes after more than 25 blank rows", () => {
    const rows: unknown[][] = [
      ["Rider Name", "Phone", "Hub", "MotorNo", "MV Track No", "Plan", "Status", "Deployment Date"],
      ["Rider A", "9876543210", "Hub A", "MTR-1", "MV-1", "Plan", "Active", "2026-01-01"],
      ...Array.from({ length: 30 }, () => []),
      ["Rider B", "9876543211", "Hub B", "MTR-2", "MV-2", "Plan", "Active", "2026-02-01"],
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "MASTER_deployment");

    const parsed = new ExcelSheetParser().parseRows(workbook, "MASTER_deployment");

    expect(parsed.at(-1)).toMatchObject({
      rowNumber: 33,
      values: expect.objectContaining({ phone: "9876543211", motorno: "MTR-2" }),
    });
  });
});
