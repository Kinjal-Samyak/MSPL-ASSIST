import * as XLSX from "xlsx";
import { ExcelSyncRowMapper } from "../../excel/excel-sync.mapper";
import { normalizePhoneNumber, parseExcelDate } from "../../excel/excel-sync.normalization";
import { ExcelSheetParser } from "../../excel/sheet-parser";
import { resolveHeaderRow } from "../../excel/excel-header-normalizer";

describe("Excel synchronization normalization pipeline", () => {
  it.each([
    [45964, "2025-11-03T00:00:00.000Z"],
    [45964.5, "2025-11-03T12:00:00.000Z"],
    ["22-06-2025", "2025-06-22T00:00:00.000Z"],
    ["2025-06-22", "2025-06-22T00:00:00.000Z"],
    ["22/06/2025", "2025-06-22T00:00:00.000Z"],
  ])("parses supported Excel date %p", (input, expected) => {
    expect(parseExcelDate(input)?.toISOString()).toBe(expected);
  });

  it("rejects zero date placeholders without recursion", () => {
    expect(parseExcelDate(0)).toBeNull();
    expect(parseExcelDate("0")).toBeNull();
  });

  it.each([
    ["9876543210", "9876543210"],
    ["+91 98765-43210", "919876543210"],
    ["9876543210.0", "9876543210"],
  ])("normalizes phone %p", (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  it("detects a non-first header row and maps workbook aliases", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["MASTER DEPLOYMENT REPORT"],
      [],
      ["Rider Name", "Rider Phone Number", "Hub Name", "MotorNo", "MV Track No", "Plan", "FDD Status", "Start Date"],
      ["Rider One", "+91 9876543210", "Central", "MTR-1", "MV-1", "Gold", "Active", 45964],
    ]);
    const workbook = { SheetNames: ["MASTER_deployment"], Sheets: { MASTER_deployment: worksheet } };
    const rows = new ExcelSheetParser().parseRows(workbook, "MASTER_deployment");
    const mapped = new ExcelSyncRowMapper().mapMasterDeploymentRow(rows[0]);

    expect(rows[0].rowNumber).toBe(4);
    expect(mapped).toMatchObject({
      rider: "Rider One",
      phone: "+91 9876543210",
      hub: "Central",
      vehicle: "MTR-1",
      mvTrackNumber: "MV-1",
      plan: "Gold",
      status: "Active",
      deploymentDate: "2025-11-03T00:00:00.000Z",
    });
  });

  it("selects source-specific headers and rejects low-confidence title rows", () => {
    expect(resolveHeaderRow([
      ["INVENTORY REPORT"],
      ["MotorNo", "MV Track No", "Vehicle Model", "Status", "Hub"],
    ])).toMatchObject({ source: "INVENTORY_NSPL", headerRowIndex: 1 });
    expect(resolveHeaderRow([["MASTER DEPLOYMENT REPORT"], ["Generated on", "2026-07-17"]])).toBeNull();
  });

  it("retains inventory charger numbers discovered through aliases", () => {
    const mapped = new ExcelSyncRowMapper().mapInventoryNsplRow({
      rowNumber: 2,
      values: {
        motorno: "MTR-2",
        "mv track no": "MV-2",
        "vehicle model": "Model Z",
        status: "Available",
        hub: "Central",
        "charger number": "CHR-2",
      },
    });

    expect(mapped.chargerNumber).toBe("CHR-2");
  });

  it("prefers verified source aliases over stale configured mappings", () => {
    const mapper = new ExcelSyncRowMapper({
      masterColumnMapping: {
        customerName: "Hub Name",
        phone: "Rider Phone Number",
        hub: "Hub Name",
        vehicleNumber: "Vehicle Days",
        mvTrackNumber: "MotorNo.",
        plan: "Plan",
        rentalStatus: "FDD Status",
        deploymentDate: "Month",
        returnDate: "Month",
        coordinator: "Month",
      },
    });
    const mapped = mapper.mapMasterDeploymentRow({
      rowNumber: 2,
      values: {
        month: "Nov",
        "rider name": "Rider One",
        "rider phone number": 9876543210,
        "hub name": "Central",
        motorno: "MTR-1",
        "mv track no": "MV-1",
        plan: "1A",
        "fdd status": "Plan Start",
        "start date": 45964,
        "end date": 45971,
        "sales collection person name": "Coordinator One",
      },
    });

    expect(mapped).toMatchObject({
      rider: "Rider One",
      vehicle: "MTR-1",
      mvTrackNumber: "MV-1",
      deploymentDate: "2025-11-03T00:00:00.000Z",
      returnDate: "45971",
      coordinator: "Coordinator One",
    });
  });
});
