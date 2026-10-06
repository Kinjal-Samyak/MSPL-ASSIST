import { ValidationError } from "../../errors";
import {
  validateBrowseOneDriveItemsInput,
  validateDetectMappingsInput,
  validateOperationalDataInput,
  validatePreviewConfigurationInput,
  validateSaveWizardConfigurationInput,
  validateUpdateOperationalDataInput,
  validateWorkbookHeadersInput,
  validateWorkbookUrlsInput,
} from "../../validators/operational-data.validator";

describe("operational-data.validator", () => {
  it("should_validate_operational_data_input", () => {
    const result = validateOperationalDataInput({
      operationalDataFolder: "C:\\data",
      masterWorkbook: "master.xlsx",
      masterWorksheet: "Sheet1",
      inventoryWorkbook: "inventory.xlsx",
      inventoryWorksheet: "Sheet2",
    });

    expect(result.operationalDataFolder).toBe("C:\\data");
    expect(result.masterWorkbook).toBe("master.xlsx");
    expect(result.masterWorksheet).toBe("Sheet1");
    expect(result.inventoryWorkbook).toBe("inventory.xlsx");
    expect(result.inventoryWorksheet).toBe("Sheet2");
  });

  it("should_reject_invalid_sync_frequency", () => {
    expect(() =>
      validateUpdateOperationalDataInput({
        operationalDataFolder: "C:\\data",
        masterWorkbook: "master.xlsx",
        masterWorksheet: "Master",
        inventoryWorkbook: "inventory.xlsx",
        inventoryWorksheet: "Inventory",
        masterColumnMapping: {
          customerName: "Customer Name",
          phone: "Phone",
          hub: "Hub",
          vehicleNumber: "Vehicle Number",
          mvTrackNumber: "MV Track Number",
          plan: "Plan",
          rentalStatus: "Rental Status",
          deploymentDate: "Deployment Date",
          returnDate: "Return Date",
          coordinator: "Coordinator",
        },
        inventoryColumnMapping: {
          mvTrackNumber: "MV Track Number",
          vehicleNumber: "Vehicle Number",
          model: "Model",
          modelCode: "Model Code",
          status: "Status",
          hub: "Hub",
          battery: "Battery",
          iotDevice: "IOT Device",
          vin: "VIN",
          motorNumber: "Motor Number",
          chassisNumber: "Chassis Number",
        },
        autoSyncEnabled: true,
        syncFrequency: "WEEKLY",
      })
    ).toThrow(ValidationError);
  });

  it("should_validate_workbook_wizard_inputs", () => {
    const workbookUrls = validateWorkbookUrlsInput({
      masterWorkbookUrl: "https://example.com/master.xlsx",
      inventoryWorkbookUrl: "https://example.com/inventory.xlsx",
    });
    expect(workbookUrls.masterWorkbookUrl).toContain("master.xlsx");

    const headers = validateWorkbookHeadersInput({
      masterWorkbookUrl: "https://example.com/master.xlsx",
      inventoryWorkbookUrl: "https://example.com/inventory.xlsx",
      masterWorksheet: "Master",
      inventoryWorksheet: "Inventory",
      headerRow: 1,
    });
    expect(headers.headerRow).toBe(1);

    const mapping = validateDetectMappingsInput({
      masterHeaders: ["MV Track No"],
      inventoryHeaders: ["MV Track No"],
    });
    expect(mapping.masterHeaders).toHaveLength(1);

    const preview = validatePreviewConfigurationInput({
      masterWorkbookUrl: "https://example.com/master.xlsx",
      inventoryWorkbookUrl: "https://example.com/inventory.xlsx",
      masterWorksheet: "Master",
      inventoryWorksheet: "Inventory",
      relationshipMasterColumn: "MV Track No",
      relationshipInventoryColumn: "MV Track No",
    });
    expect(preview.relationshipMasterColumn).toBe("MV Track No");
  });

  it("should_allow_drive_item_workbook_sources", () => {
    const workbookSources = validateWorkbookUrlsInput({
      masterDriveId: "drive-master",
      masterItemId: "item-master",
      inventoryDriveId: "drive-inventory",
      inventoryItemId: "item-inventory",
    });
    expect(workbookSources.masterDriveId).toBe("drive-master");
    expect(workbookSources.inventoryItemId).toBe("item-inventory");
  });

  it("should_validate_save_wizard_configuration_payload", () => {
    const result = validateSaveWizardConfigurationInput({
      masterWorkbookUrl: "https://example.com/master.xlsx",
      inventoryWorkbookUrl: "https://example.com/inventory.xlsx",
      masterWorksheet: "Master",
      inventoryWorksheet: "Inventory",
      relationshipMasterColumn: "MV Track No",
      relationshipInventoryColumn: "MV Track No",
      headerRow: 1,
      autoDetectedMappings: {},
      manualMappings: {},
      masterColumnMapping: {
        customerName: "Customer Name",
        phone: "Phone",
        hub: "Hub",
        vehicleNumber: "Vehicle Number",
        mvTrackNumber: "MV Track Number",
        plan: "Plan",
        rentalStatus: "Rental Status",
        deploymentDate: "Deployment Date",
        returnDate: "Return Date",
        coordinator: "Coordinator",
      },
      inventoryColumnMapping: {
        mvTrackNumber: "MV Track Number",
        vehicleNumber: "Vehicle Number",
        model: "Model",
        modelCode: "Model Code",
        status: "Status",
        hub: "Hub",
        battery: "Battery",
        iotDevice: "IOT Device",
        vin: "VIN",
        motorNumber: "Motor Number",
        chassisNumber: "Chassis Number",
      },
      autoSyncEnabled: true,
      syncFrequency: "DAILY",
    });
    expect(result.syncFrequency).toBe("DAILY");
  });

  it("should_validate_onedrive_browse_input", () => {
    const result = validateBrowseOneDriveItemsInput({
      driveId: "drive-123",
      parentItemId: "folder-1",
    });
    expect(result.driveId).toBe("drive-123");
    expect(result.parentItemId).toBe("folder-1");
  });
});
