import type { ExcelSyncConfigDto, ExcelSyncEngineResultDto } from "../dto/excel-sync.dto";
import type { SyncEngine, SyncEngineDependencies } from "../interfaces/excel-sync.interface";
import { ExcelSynchronizationService } from "./excel-sync.service";

export class ExcelSynchronizationEngine implements SyncEngine {
  constructor(
    private readonly dependencies: SyncEngineDependencies = {
      syncService: new ExcelSynchronizationService(),
    }
  ) {}

  async run(config: ExcelSyncConfigDto): Promise<ExcelSyncEngineResultDto> {
    const startedAt = new Date();
    const [masterDeploymentResult, inventoryResult] = await Promise.all([
      this.dependencies.syncService.syncMasterDeployment(config),
      this.dependencies.syncService.syncInventoryNspl(config),
    ]);
    const finishedAt = new Date();

    return {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      results: [masterDeploymentResult, inventoryResult],
    };
  }
}
