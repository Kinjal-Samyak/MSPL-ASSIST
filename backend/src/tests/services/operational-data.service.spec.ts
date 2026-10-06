import { ValidationError } from "../../errors";
import { OperationalDataService } from "../../services/operational-data.service";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function createMasterMapping() {
  return {
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
  };
}

function createInventoryMapping() {
  return {
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
  };
}

describe("OperationalDataService", () => {
  it("should_normalize_invalid_frequency_to_manual", async () => {
    const repository = {
      getSettings: jest.fn().mockResolvedValue({
        operationalDataFolder: "C:\\data",
        masterWorkbook: "master.xlsx",
        masterWorksheet: "Master",
        inventoryWorkbook: "inventory.xlsx",
        inventoryWorksheet: "Inventory",
        masterColumnMapping: createMasterMapping(),
        inventoryColumnMapping: createInventoryMapping(),
        autoSyncEnabled: false,
        syncFrequency: "UNSUPPORTED",
        lastSyncTime: null,
        lastSuccessfulSync: null,
        lastValidation: null,
        lastSyncStatus: null,
        lastSyncDuration: null,
        lastSyncRowsImported: 0,
        lastSyncRowsUpdated: 0,
        lastSyncRowsFailed: 0,
        masterDeploymentLastModified: null,
        inventoryLastModified: null,
        workbookHash: null,
        worksheetHash: null,
      }),
    } as any;

    const service = new OperationalDataService(repository);
    const result = await service.getSettings();
    expect(result.syncFrequency).toBe("MANUAL");
  });

  it("should_scan_folder_files", async () => {
    const scanner = {
      scanFolder: jest.fn().mockReturnValue(["a.xlsx", "b.xlsm"]),
    } as any;
    const service = new OperationalDataService({} as any, scanner, {} as any, {} as any);
    const result = await service.scanFolder({ folder: "C:\\data" });
    expect(result.files).toEqual(["a.xlsx", "b.xlsm"]);
  });

  it("should_load_worksheets_with_auto_select", async () => {
    const metadataReader = {
      listWorksheets: jest.fn().mockReturnValue(["Data"]),
    } as any;
    const service = new OperationalDataService({} as any, {} as any, metadataReader, {} as any);
    const result = await service.loadWorksheets({ folder: "C:\\data", workbook: "m.xlsx" });
    expect(result.worksheets).toEqual(["Data"]);
    expect(result.autoSelectedWorksheet).toBe("Data");
  });

  it("should_fail_validation_when_validator_returns_errors", async () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "mspl-operational-"));
    fs.writeFileSync(path.join(folder, "master.xlsx"), "m");
    fs.writeFileSync(path.join(folder, "inventory.xlsx"), "i");
    const repository = {
      getSettings: jest.fn().mockResolvedValue({
        operationalDataFolder: "C:\\data",
        masterWorkbook: "master.xlsx",
        masterWorksheet: "Master",
        inventoryWorkbook: "inventory.xlsx",
        inventoryWorksheet: "Inventory",
        masterColumnMapping: createMasterMapping(),
        inventoryColumnMapping: createInventoryMapping(),
        autoSyncEnabled: false,
        syncFrequency: "MANUAL",
        lastSyncTime: null,
        lastSuccessfulSync: null,
        lastValidation: null,
        lastSyncStatus: null,
        lastSyncDuration: null,
        lastSyncRowsImported: 0,
        lastSyncRowsUpdated: 0,
        lastSyncRowsFailed: 0,
        masterDeploymentLastModified: null,
        inventoryLastModified: null,
        workbookHash: null,
        worksheetHash: null,
      }),
      saveSyncStatus: jest.fn().mockResolvedValue(undefined),
    } as any;
    const metadataReader = {
      listWorksheets: jest.fn().mockReturnValue(["Master"]),
    } as any;
    const validator = {
      validate: jest.fn().mockReturnValue({
        isValid: false,
        errors: ["Required column missing in master worksheet: phone"],
        warnings: [],
        resolvedMasterWorksheet: "Master",
        resolvedInventoryWorksheet: "Inventory",
        masterWorkbookHash: "h1",
        inventoryWorkbookHash: "h2",
      }),
      computeWorksheetHash: jest.fn().mockReturnValue("wh"),
    } as any;

    const service = new OperationalDataService(repository, {} as any, metadataReader, validator);
    await expect(
      service.validateConfiguration({
        operationalDataFolder: folder,
        masterWorkbook: "master.xlsx",
        inventoryWorkbook: "inventory.xlsx",
      })
    ).rejects.toThrow(ValidationError);
    fs.rmSync(folder, { recursive: true, force: true });
  });

  it("should_validate_workbook_urls_and_detect_mappings", async () => {
    const cloudWorkbook = {
      getWorkbookMetadata: jest
        .fn()
        .mockResolvedValueOnce({
          workbookUrl: "https://example.com/master.xlsx",
          workbookName: "master.xlsx",
          workbookSize: 100,
          modifiedDate: null,
          worksheets: ["Master"],
          autoSelectedWorksheet: "Master",
        })
        .mockResolvedValueOnce({
          workbookUrl: "https://example.com/inventory.xlsx",
          workbookName: "inventory.xlsx",
          workbookSize: 90,
          modifiedDate: null,
          worksheets: ["Inventory"],
          autoSelectedWorksheet: "Inventory",
        }),
      loadHeaders: jest
        .fn()
        .mockResolvedValueOnce(["MV Track No", "Customer Name"])
        .mockResolvedValueOnce(["MV Track No", "Battery Number"]),
      downloadToTempFile: jest.fn(),
      cleanupTempFile: jest.fn(),
    } as any;
    const service = new OperationalDataService({} as any, {} as any, {} as any, {} as any, cloudWorkbook);
    const metadata = await service.validateWorkbookUrls({
      masterWorkbookUrl: "https://example.com/master.xlsx",
      inventoryWorkbookUrl: "https://example.com/inventory.xlsx",
    });
    expect(metadata.masterWorkbook.workbookName).toBe("master.xlsx");
    const headers = await service.loadWorkbookHeaders({
      masterWorkbookUrl: "https://example.com/master.xlsx",
      inventoryWorkbookUrl: "https://example.com/inventory.xlsx",
      masterWorksheet: "Master",
      inventoryWorksheet: "Inventory",
      headerRow: 1,
    });
    const mapping = await service.detectMappingSuggestions({
      masterHeaders: headers.masterHeaders,
      inventoryHeaders: headers.inventoryHeaders,
    });
    expect(mapping.relationship?.masterColumn).toBe("MV Track No");
  });

  it("should_process_graph_auth_callback", async () => {
    const graphAuth = {
      exchangeAuthorizationCode: jest.fn().mockResolvedValue({
        authenticated: true,
        expiresAt: null,
        updatedAt: null,
        lastError: null,
      }),
      getAuthStatus: jest.fn(),
      getAuthorizationUrl: jest.fn(),
    } as any;

    const service = new OperationalDataService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      graphAuth
    );

    await service.processGraphAuthorizationCallback({ code: "oauth-code" });
    expect(graphAuth.exchangeAuthorizationCode).toHaveBeenCalledWith("oauth-code");
  });

  it("should_list_onedrive_drives_and_items", async () => {
    const graphFiles = {
      listDrives: jest.fn().mockResolvedValue([
        {
          id: "drive-1",
          name: "OneDrive",
          driveType: "business",
          webUrl: "https://contoso-my.sharepoint.com/personal/admin",
        },
      ]),
      browseItems: jest.fn().mockResolvedValue({
        driveId: "drive-1",
        parentItemId: null,
        items: [
          {
            id: "file-1",
            name: "HUB_Appended.xlsx",
            type: "WORKBOOK",
            webUrl: "https://contoso.sharepoint.com/sites/a/HUB_Appended.xlsx",
            lastModifiedDate: null,
            size: 100,
          },
        ],
      }),
    } as any;
    const service = new OperationalDataService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      graphFiles
    );

    const drives = await service.listOneDriveDrives();
    expect(drives).toHaveLength(1);

    const browse = await service.browseOneDriveItems({ driveId: "drive-1" });
    expect(browse.items[0]?.name).toBe("HUB_Appended.xlsx");
    expect(graphFiles.browseItems).toHaveBeenCalledWith("drive-1", undefined);
  });

  it("should_fail_graph_auth_callback_when_provider_returns_error", async () => {
    const graphAuth = {
      exchangeAuthorizationCode: jest.fn(),
      getAuthStatus: jest.fn(),
      getAuthorizationUrl: jest.fn(),
    } as any;

    const service = new OperationalDataService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      graphAuth
    );

    await expect(
      service.processGraphAuthorizationCallback({
        error: "access_denied",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("should_save_wizard_configuration", async () => {
    const repository = {
      getSettings: jest.fn().mockResolvedValue({
        operationalDataFolder: "",
        masterWorkbook: "master.xlsx",
        masterWorkbookUrl: "https://example.com/master.xlsx",
        masterWorksheet: "Master",
        inventoryWorkbook: "inventory.xlsx",
        inventoryWorkbookUrl: "https://example.com/inventory.xlsx",
        inventoryWorksheet: "Inventory",
        relationshipMasterColumn: "MV Track No",
        relationshipInventoryColumn: "MV Track No",
        headerRow: 1,
        autoDetectedMappings: {},
        manualMappings: {},
        masterColumnMapping: createMasterMapping(),
        inventoryColumnMapping: createInventoryMapping(),
        autoSyncEnabled: true,
        syncFrequency: "HOURLY",
        lastSyncTime: null,
        lastSuccessfulSync: null,
        lastValidation: null,
        lastSyncStatus: null,
        lastSyncDuration: null,
        lastSyncRowsImported: 0,
        lastSyncRowsUpdated: 0,
        lastSyncRowsFailed: 0,
        masterDeploymentLastModified: null,
        inventoryLastModified: null,
        workbookHash: null,
        worksheetHash: null,
      }),
      saveConfiguration: jest.fn().mockResolvedValue(undefined),
      saveSyncStatus: jest.fn().mockResolvedValue(undefined),
    } as any;
    const cloudWorkbook = {
      getWorkbookMetadata: jest
        .fn()
        .mockResolvedValueOnce({
          workbookUrl: "https://example.com/master.xlsx",
          workbookName: "master.xlsx",
          workbookSize: 100,
          modifiedDate: null,
          worksheets: ["Master"],
          autoSelectedWorksheet: "Master",
        })
        .mockResolvedValueOnce({
          workbookUrl: "https://example.com/inventory.xlsx",
          workbookName: "inventory.xlsx",
          workbookSize: 90,
          modifiedDate: null,
          worksheets: ["Inventory"],
          autoSelectedWorksheet: "Inventory",
        }),
      loadHeaders: jest
        .fn()
        .mockResolvedValueOnce(["MV Track No", "Customer Name"])
        .mockResolvedValueOnce(["MV Track No", "Battery Number"]),
      downloadToTempFile: jest
        .fn()
        .mockResolvedValueOnce({
          tempFilePath: path.join(os.tmpdir(), "master.xlsx"),
          workbookName: "master.xlsx",
          workbookHash: "mh",
          modifiedDate: null,
        })
        .mockResolvedValueOnce({
          tempFilePath: path.join(os.tmpdir(), "inventory.xlsx"),
          workbookName: "inventory.xlsx",
          workbookHash: "ih",
          modifiedDate: null,
        }),
      cleanupTempFile: jest.fn(),
    } as any;
    const validator = {
      validate: jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        resolvedMasterWorksheet: "Master",
        resolvedInventoryWorksheet: "Inventory",
        masterWorkbookHash: "mh",
        inventoryWorkbookHash: "ih",
      }),
      computeWorksheetHash: jest.fn().mockReturnValue("wh"),
    } as any;
    const service = new OperationalDataService(repository, {} as any, {} as any, validator, cloudWorkbook);
    await service.saveWizardConfiguration({
      masterWorkbookUrl: "https://example.com/master.xlsx",
      inventoryWorkbookUrl: "https://example.com/inventory.xlsx",
      masterWorksheet: "Master",
      inventoryWorksheet: "Inventory",
      relationshipMasterColumn: "MV Track No",
      relationshipInventoryColumn: "MV Track No",
      headerRow: 1,
      autoDetectedMappings: {},
      manualMappings: {},
      masterColumnMapping: createMasterMapping(),
      inventoryColumnMapping: createInventoryMapping(),
      autoSyncEnabled: true,
      syncFrequency: "HOURLY",
    });
    expect(repository.saveConfiguration).toHaveBeenCalled();
    expect(repository.saveSyncStatus).toHaveBeenCalled();
  });
});
