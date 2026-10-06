import type { ExcelSyncConfigDto, ParsedExcelRowDto } from "../../dto/excel-sync.dto";
import { ExcelSynchronizationService } from "../../excel/excel-sync.service";

describe("ExcelSynchronizationService", () => {
  const config: ExcelSyncConfigDto = {
    scheduler: {
      enabled: false,
      mode: "MANUAL",
      historyLimit: 20,
    },
    masterDeployment: {
      workbookName: "master.xlsx",
      filePath: "master.xlsx",
      sheetName: "Master Deployment",
      activeStatuses: ["ACTIVE", "PENDING"],
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
  };

  it("should_count_insert_update_skip_fail_for_inventory_sync", async () => {
    const rows: ParsedExcelRowDto[] = [
      {
        rowNumber: 2,
        values: {
          "mv track number": "MV-001",
          model: "Model A",
          "model code": "MA",
          status: "ACTIVE",
          hub: "Kolkata",
          battery: "",
          "iot device": "",
          vin: "",
          "motor number": "M-001",
          "chassis number": "",
        },
      },
      {
        rowNumber: 3,
        values: {
          "mv track number": "MV-002",
          model: "Model B",
          "model code": "MB",
          status: "ACTIVE",
          hub: "Pune",
          battery: "",
          "iot device": "",
          vin: "",
          "motor number": "M-002",
          "chassis number": "",
        },
      },
      {
        rowNumber: 4,
        values: {
          "mv track number": "MV-002",
          model: "Model B",
          "model code": "MB",
          status: "ACTIVE",
          hub: "Pune",
          battery: "",
          "iot device": "",
          vin: "",
          "motor number": "M-002",
          "chassis number": "",
        },
      },
      {
        rowNumber: 5,
        values: {
          "mv track number": "",
          model: "Model C",
          "model code": "MC",
          status: "ACTIVE",
          hub: "Chennai",
          battery: "",
          "iot device": "",
          vin: "",
          "motor number": "",
          "chassis number": "",
        },
      },
    ];

    const reader = {
      readRows: jest.fn().mockReturnValue(rows),
    } as any;
    const repository = {
      upsertMasterDeploymentRow: jest.fn(),
      upsertInventoryNsplRow: jest
        .fn()
        .mockResolvedValueOnce("inserted")
        .mockResolvedValueOnce("updated"),
    } as any;
    const syncLogger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    const service = new ExcelSynchronizationService(
      reader,
      undefined as any,
      undefined as any,
      repository,
      syncLogger
    );
    const result = await service.syncInventoryNspl(config);

    expect(result.summary.rowsRead).toBe(4);
    expect(result.summary.rowsInserted).toBe(1);
    expect(result.summary.rowsUpdated).toBe(1);
    expect(result.summary.rowsSkipped).toBe(2);
    expect(result.summary.rowsFailed).toBe(0);
  });

  it("should_use_motor_number_as_the_inventory_sync_key_and_reconcile_after_each_complete_run", async () => {
    const reader = {
      readRows: jest.fn().mockReturnValue([
        {
          rowNumber: 2,
          values: {
            "mv track number": "MV-OLD", model: "Model A", "model code": "MA", status: "ACTIVE", hub: "Kolkata",
            battery: "", "iot device": "", vin: "", "motor number": "M-001", "chassis number": "",
          },
        },
        {
          rowNumber: 3,
          values: {
            "mv track number": "MV-NEW", model: "Model A", "model code": "MA", status: "ACTIVE", hub: "Kolkata",
            battery: "", "iot device": "", vin: "", "motor number": "M001", "chassis number": "",
          },
        },
      ]),
    } as any;
    const repository = {
      upsertMasterDeploymentRow: jest.fn(),
      upsertInventoryNsplRow: jest.fn().mockResolvedValue("inserted"),
      pruneInventoryNsplRows: jest.fn().mockResolvedValue(1),
    } as any;
    const service = new ExcelSynchronizationService(
      reader,
      undefined as any,
      undefined as any,
      repository,
      { info: jest.fn(), error: jest.fn() } as any
    );

    const result = await service.syncInventoryNspl(config);

    expect(result.summary.rowsInserted).toBe(1);
    expect(result.summary.rowsSkipped).toBe(1);
    expect(repository.upsertInventoryNsplRow).toHaveBeenCalledTimes(1);
    expect(repository.pruneInventoryNsplRows).toHaveBeenCalledWith(["M001"]);
  });

  it("should_mark_latest_plan_start_deployment_per_rider", async () => {
    const reader = {
      readRows: jest.fn().mockReturnValue([
        {
          rowNumber: 2,
          values: {
            "customer name": "Rider One",
            phone: "9876543210",
            hub: "Kolkata",
            "vehicle number": "WB12AB1111",
            "mv track number": "MV-001",
            plan: "Gold",
            "rental status": "ACTIVE",
            "deployment date": "2026-07-11",
            "return date": "2026-07-12",
            "fdd status": "Plan Start",
            coordinator: "Coord A",
          },
        },
        {
          rowNumber: 3,
          values: {
            "customer name": "Rider One",
            phone: "9876543210",
            hub: "Kolkata",
            "vehicle number": "WB12AB2222",
            "mv track number": "MV-002",
            plan: "Gold",
            "rental status": "INACTIVE",
            "deployment date": "2026-07-10",
            "return date": "2026-07-15",
            "fdd status": "Plan Start",
            coordinator: "Coord A",
          },
        },
      ]),
    } as any;

    const persistedRows: Array<{ mvTrackNumber: string; isLatestForRider: boolean }> = [];
    const repository = {
      upsertMasterDeploymentRow: jest.fn().mockImplementation(async (row) => {
        persistedRows.push({ mvTrackNumber: row.mvTrackNumber, isLatestForRider: row.isLatestForRider });
        return "inserted";
      }),
      upsertInventoryNsplRow: jest.fn(),
    } as any;

    const service = new ExcelSynchronizationService(
      reader,
      undefined as any,
      undefined as any,
      repository,
      { info: jest.fn(), error: jest.fn() } as any
    );
    await service.syncMasterDeployment(config);

    expect(persistedRows).toEqual([
      { mvTrackNumber: "MV-001", isLatestForRider: true },
      { mvTrackNumber: "MV-002", isLatestForRider: false },
    ]);
  });

  it("should_not_reconcile_inventory_after_an_incomplete_import", async () => {
    const reader = {
      readRows: jest.fn().mockReturnValue([
        {
          rowNumber: 2,
          values: {
            "mv track number": "MV-001",
            model: "Model A",
            status: "ACTIVE",
            hub: "Kolkata",
            "motor number": "M-001",
          },
        },
        {
          rowNumber: 3,
          values: {
            "mv track number": "MV-002",
            model: "Model B",
            status: "ACTIVE",
            hub: "Pune",
            "motor number": "",
          },
        },
      ]),
    } as any;
    const repository = {
      upsertMasterDeploymentRow: jest.fn(),
      upsertInventoryNsplRow: jest.fn().mockResolvedValue("inserted"),
      pruneInventoryNsplRows: jest.fn().mockResolvedValue(0),
    } as any;
    const service = new ExcelSynchronizationService(
      reader,
      undefined as any,
      undefined as any,
      repository,
      { info: jest.fn(), error: jest.fn() } as any
    );

    const result = await service.syncInventoryNspl(config);

    expect(result.summary.rowsInserted).toBe(1);
    expect(result.summary.rowsSkipped).toBe(1);
    expect(repository.pruneInventoryNsplRows).not.toHaveBeenCalled();
  });
});
