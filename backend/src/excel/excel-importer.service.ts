import type { ExcelSyncConfigDto, ExcelSyncEngineResultDto } from "../dto/excel-sync.dto";
import { ExcelSynchronizationEngine } from "./excel-sync.engine";

export class ExcelImporterService {
  constructor(private readonly engine: ExcelSynchronizationEngine = new ExcelSynchronizationEngine()) {}

  import(config: ExcelSyncConfigDto): Promise<ExcelSyncEngineResultDto> {
    return this.engine.run(config);
  }
}

