import { ExcelSyncValidationService } from "../../excel/excel-sync.validator";

describe("ExcelSyncValidationService", () => {
  const validator = new ExcelSyncValidationService();

  it("normalizes valid deployment values without throwing", () => {
    const result = validator.validateMasterDeploymentRow({
      rowNumber: 2,
      rider: "  Rider One ",
      phone: "+91 98765-43210",
      hub: " Kolkata ",
      vehicle: " MTR-123 ",
      mvTrackNumber: " mv-001 ",
      plan: " Gold ",
      status: " active ",
      deploymentDate: "22-06-2025",
      returnDate: "2025-06-23",
      coordinator: " Coord A ",
      paidStatus: " Open ",
      fddStatus: " Plan Start ",
      isLatestForRider: false,
    });

    expect(result.issues).toEqual([]);
    expect(result.value).toMatchObject({
      rider: "Rider One",
      phone: "919876543210",
      vehicle: "MTR-123",
      mvTrackNumber: "MV-001",
      plan: "Gold",
      status: "ACTIVE",
      deploymentDate: "2025-06-22T00:00:00.000Z",
    });
  });

  it("retains rider-only Master rows when deployment fields are incomplete", () => {
    const result = validator.validateMasterDeploymentRow({
      rowNumber: 9,
      rider: "Rider",
      phone: "123",
      hub: "Hub",
      vehicle: "",
      mvTrackNumber: "",
      plan: "",
      status: "",
      deploymentDate: "not-a-date",
      returnDate: null,
      coordinator: "",
      paidStatus: null,
      fddStatus: null,
      isLatestForRider: false,
    });

    expect(result.issues).toEqual([]);
    expect(result.value).toMatchObject({ phone: "123", vehicle: "", fddStatus: null });
  });

  it("retains MotorNo rows for vehicle classification even when rider fields are incomplete", () => {
    const result = validator.validateMasterDeploymentRow({
      rowNumber: 10,
      rider: "",
      phone: "",
      hub: "Hub",
      vehicle: "MTR-10",
      mvTrackNumber: "",
      plan: "",
      status: "",
      deploymentDate: "",
      returnDate: null,
      coordinator: "",
      paidStatus: null,
      fddStatus: null,
      isLatestForRider: false,
    });

    expect(result.issues).toEqual([]);
    expect(result.value).toMatchObject({ vehicle: "MTR-10", phone: "" });
  });

  it("requires the physical motor number for inventory deduplication", () => {
    const result = validator.validateInventoryNsplRow({
      rowNumber: 4,
      mvTrackNumber: "MV-1",
      model: "Model",
      modelCode: "",
      vehicleStatus: "ACTIVE",
      hub: "Hub",
      batteryNumber: null,
      iotDevice: null,
      vin: "invalid vin!",
      motorNumber: null,
      chassisNumber: null,
    });

    expect(result.value).toBeNull();
    expect(result.issues).toEqual(expect.arrayContaining([
      { column: "vin", reason: "must be alphanumeric" },
      { column: "motorNumber", reason: "is required" },
    ]));
  });
});
