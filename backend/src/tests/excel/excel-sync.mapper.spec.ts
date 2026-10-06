import { ExcelSyncRowMapper } from "../../excel/excel-sync.mapper";

describe("ExcelSyncRowMapper", () => {
  it("should_map_master_deployment_rows_from_alias_columns", () => {
    const mapper = new ExcelSyncRowMapper({
      masterColumnMapping: {
        customerName: "rider name",
        phone: "mobile",
        hub: "hub",
        vehicleNumber: "vehicle",
        mvTrackNumber: "mv track no",
        plan: "plan",
        rentalStatus: "status",
        deploymentDate: "deployment date",
        returnDate: "return date",
        coordinator: "coordinator",
      },
    });

    const result = mapper.mapMasterDeploymentRow({
      rowNumber: 2,
      values: {
        "rider name": "Rider One",
        mobile: "9876543210",
        hub: "Kolkata",
        vehicle: "WB12AB1234",
        "mv track no": "mv-1001",
        plan: "Plan A",
        status: "active",
        "deployment date": "2026-07-10",
        "return date": "2026-07-14",
        coordinator: "Coordinator A",
      },
    });

    expect(result).toMatchObject({
      rider: "Rider One",
      phone: "9876543210",
      hub: "Kolkata",
      vehicle: "WB12AB1234",
      mvTrackNumber: "mv-1001",
      plan: "Plan A",
      status: "active",
      coordinator: "Coordinator A",
    });
    expect(result.deploymentDate).toBe("2026-07-10T00:00:00.000Z");
  });

  it("should_map_inventory_rows_from_alias_columns", () => {
    const mapper = new ExcelSyncRowMapper({
      inventoryColumnMapping: {
        mvTrackNumber: "mv track number",
        vehicleNumber: "vehicle number",
        model: "model",
        modelCode: "model code",
        status: "vehicle status",
        hub: "hub",
        battery: "battery no",
        iotDevice: "iot",
        vin: "vin",
        motorNumber: "motor no",
        chassisNumber: "chassis no",
      },
    });

    const result = mapper.mapInventoryNsplRow({
      rowNumber: 3,
      values: {
        "mv track number": "MV-009",
        model: "Model X",
        "model code": "mx",
        "vehicle status": "deployed",
        hub: "Pune",
        "battery no": "BAT-009",
        iot: "IOT-09",
        vin: "vin-009",
        "motor no": "MTR-009",
        "chassis no": "CHS-009",
      },
    });

    expect(result).toEqual({
      rowNumber: 3,
      mvTrackNumber: "MV-009",
      model: "Model X",
      modelCode: "mx",
      vehicleStatus: "deployed",
      hub: "Pune",
      batteryNumber: "BAT-009",
      chargerNumber: null,
      iotDevice: "IOT-09",
      vin: "vin-009",
      motorNumber: "MTR-009",
      chassisNumber: "CHS-009",
    });
  });

  it("should_map_headers_with_generated_suffixes_from_sheet_parser", () => {
    const mapper = new ExcelSyncRowMapper({
      inventoryColumnMapping: {
        mvTrackNumber: "mv track no.",
        vehicleNumber: "vehicle number",
        model: "model",
        modelCode: "model code",
        status: "status",
        hub: "hub",
        battery: "battery no",
        iotDevice: "iot",
        vin: "vin",
        motorNumber: "motor no",
        chassisNumber: "chassis no",
      },
    });

    const result = mapper.mapInventoryNsplRow({
      rowNumber: 4,
      values: {
        "mv track no. 1": "MV-777",
        model: "Model Y",
        "model code": "MY",
        status: "deployed",
        hub: "Delhi",
        "battery no": "BAT-777",
        iot: "IOT-777",
        vin: "VIN777",
        "motor no": "MTR777",
        "chassis no": "CHS777",
      },
    });

    expect(result.mvTrackNumber).toBe("MV-777");
  });

  it("should_map_motor_number_when_sheet_uses_motorno_punctuation", () => {
    const mapper = new ExcelSyncRowMapper({
      inventoryColumnMapping: {
        mvTrackNumber: "mv track number",
        vehicleNumber: "vehicle number",
        model: "model",
        modelCode: "model code",
        status: "vehicle status",
        hub: "hub",
        battery: "battery no",
        iotDevice: "iot",
        vin: "vin",
        motorNumber: "motor no",
        chassisNumber: "chassis no",
      },
    });

    const result = mapper.mapInventoryNsplRow({
      rowNumber: 5,
      values: {
        "mv track number": "MV-010",
        model: "Model Z",
        "model code": "mz",
        "vehicle status": "deployed",
        hub: "Kolkata",
        "battery no": "BAT-010",
        iot: "IOT-10",
        vin: "VIN-010",
        "motorno.": "MTR-010",
        "chassis no": "CHS-010",
      },
    });

    expect(result.motorNumber).toBe("MTR-010");
  });
});
