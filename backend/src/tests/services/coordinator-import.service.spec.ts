import * as XLSX from "xlsx";
import { CoordinatorImportService } from "../../services/coordinator-import.service";

function workbook(rows: unknown[][]): string {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Service Register");
  return XLSX.write(book, { type: "base64", bookType: "xlsx" });
}

describe("CoordinatorImportService", () => {
  const makeService = () => {
    const importBatch = { create: jest.fn(async ({ data }) => ({ id: "batch-1", ...data, errors: data.errors.create, createdAt: new Date(), updatedAt: new Date() })) };
    const prisma = {
      ticket: { findMany: jest.fn().mockResolvedValue([{ ticketNumber: "MV-260115-008" }]) },
      statusMaster: { findMany: jest.fn().mockResolvedValue([{ name: "Open" }, { name: "Closed" }]) },
      issueCategory: { findMany: jest.fn().mockResolvedValue([{ name: "Other" }, { name: "Battery" }, { name: "Brake not working" }]) },
      hub: { findMany: jest.fn().mockResolvedValue([]) },
      importBatch,
    };
    return { service: new CoordinatorImportService(prisma as any), importBatch };
  };

  it("maps the existing Service Register headers and categorises inserts and updates", async () => {
    const { service } = makeService();
    const result = await service.uploadAndValidate({ fileName: "Service Details - Update.xlsx", fileSizeBytes: 2048, contentBase64: workbook([
      ["Sl. No.", "Status", "Complaint received/Login Date", "Ticket No.", "Customer Name", "Customer Contact Number", "Location", "Motor No", "Cx VOC"],
      ["1", "Closed", "15-Jan-26", "MV-260115-008", "Aritra Dutta", "7864878242", "Taratala", "MVC25AB23233", "brake issue"],
      ["2", "Open", "16-Jan-26", "MV-260116-001", "Rohit Baral", "9330759445", "Taratala", "MVC25AB25257", "battery issue"],
    ]) });
    expect(result.worksheetName).toBe("Service Register");
    expect(result.rowsFound).toBe(2);
    expect(result.rowsUpdated).toBe(1);
    expect(result.rowsInserted).toBe(1);
    expect(result.rowsValid).toBe(2);
  });

  it("rejects duplicate ticket rows and invalid mobile numbers without importing them", async () => {
    const { service } = makeService();
    const result = await service.uploadAndValidate({ fileName: "service.xlsx", fileSizeBytes: 2048, contentBase64: workbook([
      ["Status", "Complaint received/Login Date", "Ticket No.", "Customer Name", "Customer Contact Number", "Cx VOC"],
      ["Open", "16-Jan-26", "MV-260116-001", "Rohit Baral", "9330759445", "battery issue"],
      ["Open", "16-Jan-26", "MV-260116-001", "Rohit Baral", "not-a-phone", "battery issue"],
    ]) });
    expect(result.rowsDuplicate).toBe(1);
    expect(result.rowsValid).toBe(1);
    expect(result.errors.some((issue: any) => issue.errorType === "Duplicate ticket number")).toBe(true);
    expect(result.errors.some((issue: any) => issue.errorType === "Invalid mobile number")).toBe(true);
  });
});
