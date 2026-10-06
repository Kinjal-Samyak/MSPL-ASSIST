import { ExcelSynchronizationEngine } from "../../excel/excel-sync.engine";

describe("ExcelSynchronizationEngine", () => {
  it("should_run_master_and_inventory_sync_and_return_combined_result", async () => {
    const syncService = {
      syncMasterDeployment: jest.fn().mockResolvedValue({
        source: "MASTER_DEPLOYMENT",
        summary: {
          rowsRead: 1,
          rowsInserted: 1,
          rowsUpdated: 0,
          rowsSkipped: 0,
          rowsFailed: 0,
          executionTimeMs: 1,
        },
        errors: [],
      }),
      syncInventoryNspl: jest.fn().mockResolvedValue({
        source: "INVENTORY_NSPL",
        summary: {
          rowsRead: 1,
          rowsInserted: 0,
          rowsUpdated: 1,
          rowsSkipped: 0,
          rowsFailed: 0,
          executionTimeMs: 1,
        },
        errors: [],
      }),
    };

    const engine = new ExcelSynchronizationEngine({
      syncService,
    });

    const result = await engine.run({
      scheduler: {
        enabled: false,
        mode: "MANUAL",
        historyLimit: 20,
      },
      masterDeployment: {
        workbookName: "master.xlsx",
        filePath: "master.xlsx",
        sheetName: "Master Deployment",
        activeStatuses: ["ACTIVE"],
        columnMapping: {
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
      },
      inventoryNspl: {
        workbookName: "inventory.xlsx",
        filePath: "inventory.xlsx",
        sheetName: "Inventory_NSPL",
        columnMapping: {
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
      },
    });

    expect(syncService.syncMasterDeployment).toHaveBeenCalledTimes(1);
    expect(syncService.syncInventoryNspl).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(2);
  });
});
