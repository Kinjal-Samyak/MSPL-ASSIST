import type { Prisma, PrismaClient } from "@prisma/client";
import { config } from "../config";
import {
  OPERATIONAL_DATA_CATEGORY,
  OPERATIONAL_DATA_SETTING_KEYS,
  OPERATIONAL_DATA_STATUS_CATEGORY,
} from "../constants/operational-data.constants";
import type {
  InventoryColumnMappingDto,
  MasterColumnMappingDto,
} from "../dto/operational-data.dto";
import { prismaClient } from "../database";

interface SettingRecord {
  settingKey: string;
  value: Prisma.JsonValue;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const DEFAULT_MASTER_COLUMN_MAPPING: MasterColumnMappingDto = {
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

const DEFAULT_INVENTORY_COLUMN_MAPPING: InventoryColumnMappingDto = {
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

export interface OperationalDataConfigRecord {
  operationalDataFolder: string;
  masterWorkbook: string;
  masterWorkbookUrl?: string | null;
  masterDriveId?: string | null;
  masterItemId?: string | null;
  masterWorksheet: string;
  inventoryWorkbook: string;
  inventoryWorkbookUrl?: string | null;
  inventoryDriveId?: string | null;
  inventoryItemId?: string | null;
  inventoryWorksheet: string;
  relationshipMasterColumn?: string | null;
  relationshipInventoryColumn?: string | null;
  headerRow?: number;
  autoDetectedMappings?: Record<string, unknown> | null;
  manualMappings?: Record<string, unknown> | null;
  masterColumnMapping: MasterColumnMappingDto;
  inventoryColumnMapping: InventoryColumnMappingDto;
  autoSyncEnabled: boolean;
  syncFrequency: string;
  configurationVersion?: number | null;
}

export interface OperationalDataStatusRecord {
  lastSyncTime: string | null;
  lastSuccessfulSync: string | null;
  lastValidation: string | null;
  lastSyncStatus: "SUCCESS" | "FAILED" | "IDLE" | null;
  lastSyncDuration: number | null;
  lastSyncRowsImported: number;
  lastSyncRowsUpdated: number;
  lastSyncRowsFailed: number;
  masterDeploymentLastModified: string | null;
  inventoryLastModified: string | null;
  workbookHash: string | null;
  worksheetHash: string | null;
  workbookStructureHash?: string | null;
  workbookVersion?: string | null;
  graphAuthConnected?: boolean;
  graphAuthTokenExpiresAt?: string | null;
  graphAuthLastError?: string | null;
  graphAuthUpdatedAt?: string | null;
}

export interface GraphAuthStateRecord {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: string;
  scope: string;
  tokenType: string;
  acquiredAt: string;
}

export interface DryRunMetricsRecord {
  rowsRead: number;
  rowsValid: number;
  rowsInvalid: number;
  rowsInsert: number;
  rowsUpdate: number;
  rowsIgnore: number;
  relationshipFailures: number;
  validationErrors: number;
  mappingErrors: number;
  previewChanges: Array<{ key: string; action: "INSERT" | "UPDATE" | "IGNORE" }>;
  operator?: string | null;
}

export class OperationalDataRepository {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async getSettings(): Promise<OperationalDataConfigRecord & OperationalDataStatusRecord> {
    const keys = Object.values(OPERATIONAL_DATA_SETTING_KEYS);
    const rows = await this.prisma.appSetting.findMany({
      where: { settingKey: { in: keys } },
      select: { settingKey: true, value: true },
    });
    const byKey = new Map(rows.map((row) => [row.settingKey, row]));

    const graphAuthState = this.asGraphAuthState(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.graphAuthState));

    return {
      operationalDataFolder: this.asString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.folder), ""),
      masterWorkbook: this.asString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.masterWorkbook), ""),
      masterWorkbookUrl: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.masterWorkbookUrl)),
      masterDriveId: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.masterDriveId)),
      masterItemId: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.masterItemId)),
      masterWorksheet: this.asString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.masterWorksheet), ""),
      inventoryWorkbook: this.asString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.inventoryWorkbook), ""),
      inventoryWorkbookUrl: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.inventoryWorkbookUrl)),
      inventoryDriveId: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.inventoryDriveId)),
      inventoryItemId: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.inventoryItemId)),
      inventoryWorksheet: this.asString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.inventoryWorksheet), ""),
      relationshipMasterColumn: this.asNullableString(
        byKey.get(OPERATIONAL_DATA_SETTING_KEYS.relationshipMasterColumn)
      ),
      relationshipInventoryColumn: this.asNullableString(
        byKey.get(OPERATIONAL_DATA_SETTING_KEYS.relationshipInventoryColumn)
      ),
      headerRow: this.asNumber(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.headerRow), 1),
      autoDetectedMappings: this.asNullableObject(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.autoDetectedMappings)),
      manualMappings: this.asNullableObject(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.manualMappings)),
      masterColumnMapping: this.asMasterColumnMapping(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.masterColumnMapping)),
      inventoryColumnMapping: this.asInventoryColumnMapping(
        byKey.get(OPERATIONAL_DATA_SETTING_KEYS.inventoryColumnMapping)
      ),
      autoSyncEnabled: this.asBoolean(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.autoSyncEnabled), false),
      syncFrequency: this.asString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.syncInterval), "MANUAL"),
      configurationVersion: this.asNullableNumber(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.configurationVersion)),
      lastSyncTime: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.lastSyncTime)),
      lastSuccessfulSync: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.lastSuccessfulSync)),
      lastValidation: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.lastValidation)),
      lastSyncStatus: this.asNullableStatus(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.lastSyncStatus)),
      lastSyncDuration: this.asNullableNumber(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.lastSyncDuration)),
      lastSyncRowsImported: this.asNumber(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.lastSyncRowsImported), 0),
      lastSyncRowsUpdated: this.asNumber(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.lastSyncRowsUpdated), 0),
      lastSyncRowsFailed: this.asNumber(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.lastSyncRowsFailed), 0),
      masterDeploymentLastModified: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.masterLastModified)),
      inventoryLastModified: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.inventoryLastModified)),
      workbookHash: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.workbookHash)),
      worksheetHash: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.worksheetHash)),
      workbookStructureHash: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.workbookStructureHash)),
      workbookVersion: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.workbookVersion)),
      graphAuthConnected: graphAuthState !== null,
      graphAuthTokenExpiresAt: graphAuthState?.accessTokenExpiresAt ?? null,
      graphAuthLastError: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.graphAuthLastError)),
      graphAuthUpdatedAt: this.asNullableString(byKey.get(OPERATIONAL_DATA_SETTING_KEYS.graphAuthUpdatedAt)),
    };
  }

  async saveConfiguration(input: OperationalDataConfigRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.upsertSetting(tx, OPERATIONAL_DATA_SETTING_KEYS.folder, OPERATIONAL_DATA_CATEGORY, input.operationalDataFolder);
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.masterWorkbook,
        OPERATIONAL_DATA_CATEGORY,
        input.masterWorkbook
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.masterWorkbookUrl,
        OPERATIONAL_DATA_CATEGORY,
        input.masterWorkbookUrl ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.masterDriveId,
        OPERATIONAL_DATA_CATEGORY,
        input.masterDriveId ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.masterItemId,
        OPERATIONAL_DATA_CATEGORY,
        input.masterItemId ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.masterWorksheet,
        OPERATIONAL_DATA_CATEGORY,
        input.masterWorksheet
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.inventoryWorkbook,
        OPERATIONAL_DATA_CATEGORY,
        input.inventoryWorkbook
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.inventoryWorkbookUrl,
        OPERATIONAL_DATA_CATEGORY,
        input.inventoryWorkbookUrl ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.inventoryDriveId,
        OPERATIONAL_DATA_CATEGORY,
        input.inventoryDriveId ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.inventoryItemId,
        OPERATIONAL_DATA_CATEGORY,
        input.inventoryItemId ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.inventoryWorksheet,
        OPERATIONAL_DATA_CATEGORY,
        input.inventoryWorksheet
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.masterColumnMapping,
        OPERATIONAL_DATA_CATEGORY,
        input.masterColumnMapping
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.inventoryColumnMapping,
        OPERATIONAL_DATA_CATEGORY,
        input.inventoryColumnMapping
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.relationshipMasterColumn,
        OPERATIONAL_DATA_CATEGORY,
        input.relationshipMasterColumn ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.relationshipInventoryColumn,
        OPERATIONAL_DATA_CATEGORY,
        input.relationshipInventoryColumn ?? null
      );
      await this.upsertSetting(tx, OPERATIONAL_DATA_SETTING_KEYS.headerRow, OPERATIONAL_DATA_CATEGORY, input.headerRow ?? 1);
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.autoDetectedMappings,
        OPERATIONAL_DATA_CATEGORY,
        input.autoDetectedMappings ?? {}
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.manualMappings,
        OPERATIONAL_DATA_CATEGORY,
        input.manualMappings ?? {}
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.autoSyncEnabled,
        OPERATIONAL_DATA_CATEGORY,
        input.autoSyncEnabled
      );
      await this.upsertSetting(tx, OPERATIONAL_DATA_SETTING_KEYS.syncInterval, OPERATIONAL_DATA_CATEGORY, input.syncFrequency);
      if (input.configurationVersion !== undefined) {
        await this.upsertSetting(
          tx,
          OPERATIONAL_DATA_SETTING_KEYS.configurationVersion,
          OPERATIONAL_DATA_CATEGORY,
          input.configurationVersion
        );
      }
      await this.syncWorkbookConfigurationRecords(tx, input);
    });
  }

  async saveSyncStatus(input: OperationalDataStatusRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.upsertSetting(tx, OPERATIONAL_DATA_SETTING_KEYS.lastSyncTime, OPERATIONAL_DATA_STATUS_CATEGORY, input.lastSyncTime);
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.lastSuccessfulSync,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.lastSuccessfulSync
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.lastValidation,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.lastValidation
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.lastSyncStatus,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.lastSyncStatus
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.lastSyncDuration,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.lastSyncDuration
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.lastSyncRowsImported,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.lastSyncRowsImported
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.lastSyncRowsUpdated,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.lastSyncRowsUpdated
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.lastSyncRowsFailed,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.lastSyncRowsFailed
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.masterLastModified,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.masterDeploymentLastModified
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.inventoryLastModified,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.inventoryLastModified
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.workbookHash,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.workbookHash
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.worksheetHash,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.worksheetHash
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.workbookStructureHash,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.workbookStructureHash ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.workbookVersion,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.workbookVersion ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.graphAuthLastError,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.graphAuthLastError ?? null
      );
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.graphAuthUpdatedAt,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        input.graphAuthUpdatedAt ?? null
      );
      await tx.operationalDataset.upsert({
        where: {
          datasetCode: "DEFAULT_OPERATIONAL_DATASET",
        },
        update: {
          active: true,
          healthStatus: input.lastSyncStatus === "FAILED" ? "ERROR" : input.lastSyncStatus === "SUCCESS" ? "HEALTHY" : "WARNING",
          lastSyncedAt: input.lastSyncTime ? new Date(input.lastSyncTime) : null,
        },
        create: {
          datasetCode: "DEFAULT_OPERATIONAL_DATASET",
          name: "Default Operational Dataset",
          description: "Primary operational dataset synchronization state.",
          active: true,
          healthStatus: input.lastSyncStatus === "FAILED" ? "ERROR" : input.lastSyncStatus === "SUCCESS" ? "HEALTHY" : "WARNING",
          lastSyncedAt: input.lastSyncTime ? new Date(input.lastSyncTime) : null,
        },
      });
      await this.syncWorkbookSchemaVersion(tx, input);
    });
  }

  async getGraphAuthState(): Promise<GraphAuthStateRecord | null> {
    const persistedToken = await this.prisma.microsoftGraphToken.findUnique({
      where: {
        tenantId_clientId: {
          tenantId: config.m365.tenantId,
          clientId: config.m365.clientId,
        },
      },
      select: {
        encryptedAccessToken: true,
        encryptedRefreshToken: true,
        accessTokenExpiresAt: true,
        scope: true,
        tokenType: true,
        acquiredAt: true,
        revokedAt: true,
      },
    });

    if (persistedToken && persistedToken.revokedAt === null) {
      return {
        encryptedAccessToken: persistedToken.encryptedAccessToken,
        encryptedRefreshToken: persistedToken.encryptedRefreshToken,
        accessTokenExpiresAt: persistedToken.accessTokenExpiresAt.toISOString(),
        scope: persistedToken.scope,
        tokenType: persistedToken.tokenType,
        acquiredAt: persistedToken.acquiredAt.toISOString(),
      };
    }

    const row = await this.prisma.appSetting.findUnique({
      where: {
        settingKey: OPERATIONAL_DATA_SETTING_KEYS.graphAuthState,
      },
      select: {
        value: true,
      },
    });

    return this.asGraphAuthState(row ? { settingKey: OPERATIONAL_DATA_SETTING_KEYS.graphAuthState, value: row.value } : undefined);
  }

  async saveGraphAuthState(input: GraphAuthStateRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const dataset = await tx.operationalDataset.upsert({
        where: {
          datasetCode: "DEFAULT_OPERATIONAL_DATASET",
        },
        update: {
          active: true,
        },
        create: {
          datasetCode: "DEFAULT_OPERATIONAL_DATASET",
          name: "Default Operational Dataset",
          description: "Primary operational dataset for Microsoft Graph integration.",
          active: true,
        },
        select: {
          id: true,
        },
      });
      await this.upsertSetting(tx, OPERATIONAL_DATA_SETTING_KEYS.graphAuthState, OPERATIONAL_DATA_STATUS_CATEGORY, input);
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.graphAuthUpdatedAt,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        new Date().toISOString()
      );
      await this.upsertSetting(tx, OPERATIONAL_DATA_SETTING_KEYS.graphAuthLastError, OPERATIONAL_DATA_STATUS_CATEGORY, null);
      await tx.microsoftGraphToken.upsert({
        where: {
          tenantId_clientId: {
            tenantId: config.m365.tenantId,
            clientId: config.m365.clientId,
          },
        },
        update: {
          encryptedAccessToken: input.encryptedAccessToken,
          encryptedRefreshToken: input.encryptedRefreshToken,
          accessTokenExpiresAt: new Date(input.accessTokenExpiresAt),
          scope: input.scope,
          tokenType: input.tokenType,
          acquiredAt: new Date(input.acquiredAt),
          revokedAt: null,
          lastError: null,
        },
        create: {
          tenantId: config.m365.tenantId,
          clientId: config.m365.clientId,
          encryptedAccessToken: input.encryptedAccessToken,
          encryptedRefreshToken: input.encryptedRefreshToken,
          accessTokenExpiresAt: new Date(input.accessTokenExpiresAt),
          scope: input.scope,
          tokenType: input.tokenType,
          acquiredAt: new Date(input.acquiredAt),
          revokedAt: null,
          lastError: null,
        },
      });
      await tx.microsoftGraphConnection.upsert({
        where: {
          operationalDatasetId: dataset.id,
        },
        update: {
          tenantId: config.m365.tenantId,
          clientId: config.m365.clientId,
          status: "CONNECTED",
          lastConnectedAt: new Date(),
          lastError: null,
        },
        create: {
          operationalDatasetId: dataset.id,
          tenantId: config.m365.tenantId,
          clientId: config.m365.clientId,
          status: "CONNECTED",
          lastConnectedAt: new Date(),
          lastError: null,
        },
      });
    });
  }

  async clearGraphAuthState(lastError: string | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const dataset = await tx.operationalDataset.findUnique({
        where: {
          datasetCode: "DEFAULT_OPERATIONAL_DATASET",
        },
        select: {
          id: true,
        },
      });
      await this.upsertSetting(tx, OPERATIONAL_DATA_SETTING_KEYS.graphAuthState, OPERATIONAL_DATA_STATUS_CATEGORY, null);
      await this.upsertSetting(
        tx,
        OPERATIONAL_DATA_SETTING_KEYS.graphAuthUpdatedAt,
        OPERATIONAL_DATA_STATUS_CATEGORY,
        new Date().toISOString()
      );
      await this.upsertSetting(tx, OPERATIONAL_DATA_SETTING_KEYS.graphAuthLastError, OPERATIONAL_DATA_STATUS_CATEGORY, lastError);
      await tx.microsoftGraphToken.updateMany({
        where: {
          tenantId: config.m365.tenantId,
          clientId: config.m365.clientId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          lastError,
        },
      });
      if (dataset) {
        await tx.microsoftGraphConnection.upsert({
          where: {
            operationalDatasetId: dataset.id,
          },
          update: {
            tenantId: config.m365.tenantId,
            clientId: config.m365.clientId,
            status: lastError ? "ERROR" : "DISCONNECTED",
            lastError,
          },
          create: {
            operationalDatasetId: dataset.id,
            tenantId: config.m365.tenantId,
            clientId: config.m365.clientId,
            status: lastError ? "ERROR" : "DISCONNECTED",
            lastError,
          },
        });
      }
    });
  }

  async saveDryRunResult(input: DryRunMetricsRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const dataset = await tx.operationalDataset.upsert({
        where: {
          datasetCode: "DEFAULT_OPERATIONAL_DATASET",
        },
        update: {
          active: true,
        },
        create: {
          datasetCode: "DEFAULT_OPERATIONAL_DATASET",
          name: "Default Operational Dataset",
          description: "Dry-run preview metrics for operational data import.",
          active: true,
        },
        select: {
          id: true,
        },
      });

      await tx.dryRunResult.create({
        data: {
          operationalDatasetId: dataset.id,
          rowsRead: input.rowsRead,
          rowsValid: input.rowsValid,
          rowsInvalid: input.rowsInvalid,
          rowsInsert: input.rowsInsert,
          rowsUpdate: input.rowsUpdate,
          rowsIgnore: input.rowsIgnore,
          relationshipFailures: input.relationshipFailures,
          validationErrors: input.validationErrors,
          mappingErrors: input.mappingErrors,
          previewChanges: toInputJson(input.previewChanges),
          createdByUser: input.operator ?? null,
        },
      });

      await tx.importSummary.create({
        data: {
          operationalDatasetId: dataset.id,
          commitMode: "DRY_RUN",
          rowsRead: input.rowsRead,
          rowsInserted: input.rowsInsert,
          rowsUpdated: input.rowsUpdate,
          rowsIgnored: input.rowsIgnore,
          rowsDeleted: 0,
          rowsFailed: input.rowsInvalid,
          relationshipErrors: input.relationshipFailures,
          validationErrors: input.validationErrors,
          mappingErrors: input.mappingErrors,
          warnings: toInputJson({
            previewChanges: input.previewChanges,
          }),
        },
      });
    });
  }

  private async syncWorkbookConfigurationRecords(
    tx: Prisma.TransactionClient,
    input: OperationalDataConfigRecord
  ): Promise<void> {
    const masterWorkbookReference =
      input.masterWorkbookUrl ??
      (input.masterDriveId && input.masterItemId
        ? `graph://drives/${encodeURIComponent(input.masterDriveId)}/items/${encodeURIComponent(input.masterItemId)}`
        : null);
    const inventoryWorkbookReference =
      input.inventoryWorkbookUrl ??
      (input.inventoryDriveId && input.inventoryItemId
        ? `graph://drives/${encodeURIComponent(input.inventoryDriveId)}/items/${encodeURIComponent(input.inventoryItemId)}`
        : null);

    if (!masterWorkbookReference || !inventoryWorkbookReference) {
      return;
    }

    const dataset = await tx.operationalDataset.upsert({
      where: {
        datasetCode: "DEFAULT_OPERATIONAL_DATASET",
      },
      update: {
        name: "Default Operational Dataset",
        active: true,
        schedulerEnabled: input.autoSyncEnabled,
        schedulerFrequency: input.syncFrequency,
      },
      create: {
        datasetCode: "DEFAULT_OPERATIONAL_DATASET",
        name: "Default Operational Dataset",
        description: "Primary operational dataset configuration for MSPL Assist.",
        active: true,
        schedulerEnabled: input.autoSyncEnabled,
        schedulerFrequency: input.syncFrequency,
      },
      select: {
        id: true,
      },
    });

    const masterWorkbook = await tx.workbookConfiguration.upsert({
      where: {
        workbookType_workbookName: {
          workbookType: "MASTER",
          workbookName: input.masterWorkbook,
        },
      },
      update: {
        operationalDatasetId: dataset.id,
        workbookUrl: masterWorkbookReference,
        isActive: true,
      },
      create: {
        operationalDatasetId: dataset.id,
        workbookType: "MASTER",
        workbookName: input.masterWorkbook,
        workbookUrl: masterWorkbookReference,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const inventoryWorkbook = await tx.workbookConfiguration.upsert({
      where: {
        workbookType_workbookName: {
          workbookType: "INVENTORY",
          workbookName: input.inventoryWorkbook,
        },
      },
      update: {
        operationalDatasetId: dataset.id,
        workbookUrl: inventoryWorkbookReference,
        isActive: true,
      },
      create: {
        operationalDatasetId: dataset.id,
        workbookType: "INVENTORY",
        workbookName: input.inventoryWorkbook,
        workbookUrl: inventoryWorkbookReference,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const [masterWorksheet, inventoryWorksheet] = await Promise.all([
      tx.worksheetConfiguration.upsert({
        where: {
          workbookConfigurationId_worksheetName: {
            workbookConfigurationId: masterWorkbook.id,
            worksheetName: input.masterWorksheet,
          },
        },
        update: {
          headerRow: input.headerRow ?? 1,
          isSelected: true,
        },
        create: {
          workbookConfigurationId: masterWorkbook.id,
          worksheetName: input.masterWorksheet,
          headerRow: input.headerRow ?? 1,
          isSelected: true,
        },
        select: {
          id: true,
        },
      }),
      tx.worksheetConfiguration.upsert({
        where: {
          workbookConfigurationId_worksheetName: {
            workbookConfigurationId: inventoryWorkbook.id,
            worksheetName: input.inventoryWorksheet,
          },
        },
        update: {
          headerRow: input.headerRow ?? 1,
          isSelected: true,
        },
        create: {
          workbookConfigurationId: inventoryWorkbook.id,
          worksheetName: input.inventoryWorksheet,
          headerRow: input.headerRow ?? 1,
          isSelected: true,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (input.relationshipMasterColumn && input.relationshipInventoryColumn) {
      await tx.relationshipMapping.upsert({
        where: {
          masterWorkbookConfigurationId_inventoryWorkbookConfigurationId_relationshipType_version: {
            masterWorkbookConfigurationId: masterWorkbook.id,
            inventoryWorkbookConfigurationId: inventoryWorkbook.id,
            relationshipType: "MASTER_TO_INVENTORY",
            version: 1,
          },
        },
        update: {
          primaryKey: input.relationshipMasterColumn,
          relationshipField: input.relationshipInventoryColumn,
          manualOverride: true,
          masterWorksheetConfigurationId: masterWorksheet.id,
          inventoryWorksheetConfigurationId: inventoryWorksheet.id,
          lastVerified: new Date(),
        },
        create: {
          masterWorkbookConfigurationId: masterWorkbook.id,
          inventoryWorkbookConfigurationId: inventoryWorkbook.id,
          masterWorksheetConfigurationId: masterWorksheet.id,
          inventoryWorksheetConfigurationId: inventoryWorksheet.id,
          relationshipType: "MASTER_TO_INVENTORY",
          primaryKey: input.relationshipMasterColumn,
          relationshipField: input.relationshipInventoryColumn,
          manualOverride: true,
          version: 1,
          lastVerified: new Date(),
        },
      });
    }

    await this.upsertColumnMappings(tx, masterWorksheet.id, input.masterColumnMapping);
    await this.upsertColumnMappings(tx, inventoryWorksheet.id, input.inventoryColumnMapping);
  }

  private async upsertColumnMappings(
    tx: Prisma.TransactionClient,
    worksheetConfigurationId: string,
    mapping: MasterColumnMappingDto | InventoryColumnMappingDto
  ): Promise<void> {
    const mappingEntries = Object.entries(mapping).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    );
    for (const [sourceColumn, target] of mappingEntries) {
      if (target.length === 0) {
        continue;
      }
      await tx.columnMapping.upsert({
        where: {
          worksheetConfigurationId_sourceColumn_mappingVersion: {
            worksheetConfigurationId,
            sourceColumn,
            mappingVersion: 1,
          },
        },
        update: {
          targetColumn: target,
          manualOverride: true,
        },
        create: {
          worksheetConfigurationId,
          sourceColumn,
          targetColumn: target,
          manualOverride: true,
          mappingVersion: 1,
        },
      });
    }
  }

  private async syncWorkbookSchemaVersion(
    tx: Prisma.TransactionClient,
    input: OperationalDataStatusRecord
  ): Promise<void> {
    if (!input.workbookHash || !input.worksheetHash) {
      return;
    }

    const [masterWorkbook, inventoryWorkbook] = await Promise.all([
      tx.workbookConfiguration.findFirst({
        where: { workbookType: "MASTER", isActive: true },
        select: { id: true },
        orderBy: { updatedAt: "desc" },
      }),
      tx.workbookConfiguration.findFirst({
        where: { workbookType: "INVENTORY", isActive: true },
        select: { id: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const versionToken = input.workbookVersion && input.workbookVersion.includes(".")
      ? input.workbookVersion.split(".").slice(-1)[0]
      : "1";
    const versionNumber = Number(versionToken) || 1;

    const payload = {
      schemaVersion: versionNumber,
      schemaHash: input.worksheetHash,
      columnCount: 0,
      columnNames: toInputJson([]),
      headerOrder: toInputJson([]),
      modifiedDate: input.masterDeploymentLastModified ? new Date(input.masterDeploymentLastModified) : null,
      detectedDate: new Date(),
    };

    if (masterWorkbook) {
      await tx.workbookSchemaVersion.upsert({
        where: {
          workbookConfigurationId_schemaHash: {
            workbookConfigurationId: masterWorkbook.id,
            schemaHash: input.worksheetHash,
          },
        },
        update: payload,
        create: {
          workbookConfigurationId: masterWorkbook.id,
          ...payload,
        },
      });
    }

    if (inventoryWorkbook) {
      await tx.workbookSchemaVersion.upsert({
        where: {
          workbookConfigurationId_schemaHash: {
            workbookConfigurationId: inventoryWorkbook.id,
            schemaHash: input.worksheetHash,
          },
        },
        update: {
          ...payload,
          modifiedDate: input.inventoryLastModified ? new Date(input.inventoryLastModified) : null,
        },
        create: {
          workbookConfigurationId: inventoryWorkbook.id,
          ...payload,
          modifiedDate: input.inventoryLastModified ? new Date(input.inventoryLastModified) : null,
        },
      });
    }
  }

  private async upsertSetting(
    tx: Prisma.TransactionClient,
    settingKey: string,
    category: string,
    value: unknown
  ): Promise<void> {
    await tx.appSetting.upsert({
      where: { settingKey },
      update: { category, value: toInputJson(value), editableByAdmin: true },
      create: { settingKey, category, value: toInputJson(value), editableByAdmin: true },
    });
  }

  private asString(row: SettingRecord | undefined, fallback: string): string {
    return typeof row?.value === "string" ? row.value : fallback;
  }

  private asNullableString(row: SettingRecord | undefined, nestedKey?: string): string | null {
    if (nestedKey) {
      if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
        return null;
      }
      const nestedValue = (row.value as Record<string, unknown>)[nestedKey];
      return typeof nestedValue === "string" ? nestedValue : null;
    }
    return typeof row?.value === "string" ? row.value : null;
  }

  private asBoolean(row: SettingRecord | undefined, fallback: boolean): boolean {
    return typeof row?.value === "boolean" ? row.value : fallback;
  }

  private asNumber(row: SettingRecord | undefined, fallback: number): number {
    return typeof row?.value === "number" ? row.value : fallback;
  }

  private asNullableNumber(row: SettingRecord | undefined): number | null {
    return typeof row?.value === "number" ? row.value : null;
  }

  private asNullableStatus(row: SettingRecord | undefined): "SUCCESS" | "FAILED" | "IDLE" | null {
    if (row?.value === "SUCCESS" || row?.value === "FAILED" || row?.value === "IDLE") {
      return row.value;
    }
    return null;
  }

  private asNullableObject(row: SettingRecord | undefined): Record<string, unknown> | null {
    if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
      return null;
    }
    return row.value as Record<string, unknown>;
  }

  private asMasterColumnMapping(row: SettingRecord | undefined): MasterColumnMappingDto {
    if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
      return DEFAULT_MASTER_COLUMN_MAPPING;
    }
    const typed = row.value as Record<string, unknown>;
    return {
      customerName: typeof typed.customerName === "string" ? typed.customerName : DEFAULT_MASTER_COLUMN_MAPPING.customerName,
      phone: typeof typed.phone === "string" ? typed.phone : DEFAULT_MASTER_COLUMN_MAPPING.phone,
      hub: typeof typed.hub === "string" ? typed.hub : DEFAULT_MASTER_COLUMN_MAPPING.hub,
      vehicleNumber: typeof typed.vehicleNumber === "string" ? typed.vehicleNumber : DEFAULT_MASTER_COLUMN_MAPPING.vehicleNumber,
      mvTrackNumber: typeof typed.mvTrackNumber === "string" ? typed.mvTrackNumber : DEFAULT_MASTER_COLUMN_MAPPING.mvTrackNumber,
      plan: typeof typed.plan === "string" ? typed.plan : DEFAULT_MASTER_COLUMN_MAPPING.plan,
      rentalStatus: typeof typed.rentalStatus === "string" ? typed.rentalStatus : DEFAULT_MASTER_COLUMN_MAPPING.rentalStatus,
      deploymentDate: typeof typed.deploymentDate === "string" ? typed.deploymentDate : DEFAULT_MASTER_COLUMN_MAPPING.deploymentDate,
      returnDate: typeof typed.returnDate === "string" ? typed.returnDate : DEFAULT_MASTER_COLUMN_MAPPING.returnDate,
      coordinator: typeof typed.coordinator === "string" ? typed.coordinator : DEFAULT_MASTER_COLUMN_MAPPING.coordinator,
    };
  }

  private asInventoryColumnMapping(row: SettingRecord | undefined): InventoryColumnMappingDto {
    if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
      return DEFAULT_INVENTORY_COLUMN_MAPPING;
    }
    const typed = row.value as Record<string, unknown>;
    return {
      mvTrackNumber: typeof typed.mvTrackNumber === "string" ? typed.mvTrackNumber : DEFAULT_INVENTORY_COLUMN_MAPPING.mvTrackNumber,
      vehicleNumber: typeof typed.vehicleNumber === "string" ? typed.vehicleNumber : DEFAULT_INVENTORY_COLUMN_MAPPING.vehicleNumber,
      model: typeof typed.model === "string" ? typed.model : DEFAULT_INVENTORY_COLUMN_MAPPING.model,
      modelCode: typeof typed.modelCode === "string" ? typed.modelCode : DEFAULT_INVENTORY_COLUMN_MAPPING.modelCode,
      status: typeof typed.status === "string" ? typed.status : DEFAULT_INVENTORY_COLUMN_MAPPING.status,
      hub: typeof typed.hub === "string" ? typed.hub : DEFAULT_INVENTORY_COLUMN_MAPPING.hub,
      battery: typeof typed.battery === "string" ? typed.battery : DEFAULT_INVENTORY_COLUMN_MAPPING.battery,
      iotDevice: typeof typed.iotDevice === "string" ? typed.iotDevice : DEFAULT_INVENTORY_COLUMN_MAPPING.iotDevice,
      vin: typeof typed.vin === "string" ? typed.vin : DEFAULT_INVENTORY_COLUMN_MAPPING.vin,
      motorNumber: typeof typed.motorNumber === "string" ? typed.motorNumber : DEFAULT_INVENTORY_COLUMN_MAPPING.motorNumber,
      chassisNumber: typeof typed.chassisNumber === "string" ? typed.chassisNumber : DEFAULT_INVENTORY_COLUMN_MAPPING.chassisNumber,
    };
  }

  private asGraphAuthState(row: SettingRecord | undefined): GraphAuthStateRecord | null {
    if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
      return null;
    }
    const typed = row.value as Record<string, unknown>;
    if (
      typeof typed.encryptedAccessToken !== "string" ||
      typeof typed.encryptedRefreshToken !== "string" ||
      typeof typed.accessTokenExpiresAt !== "string" ||
      typeof typed.scope !== "string" ||
      typeof typed.tokenType !== "string" ||
      typeof typed.acquiredAt !== "string"
    ) {
      return null;
    }
    return {
      encryptedAccessToken: typed.encryptedAccessToken,
      encryptedRefreshToken: typed.encryptedRefreshToken,
      accessTokenExpiresAt: typed.accessTokenExpiresAt,
      scope: typed.scope,
      tokenType: typed.tokenType,
      acquiredAt: typed.acquiredAt,
    };
  }
}
