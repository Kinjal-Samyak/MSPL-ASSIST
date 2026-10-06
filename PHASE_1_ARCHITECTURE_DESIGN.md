# Phase 1: Architecture Assessment & Design
**Status:** Ready for Approval  
**Duration:** 2-3 Days  
**Objective:** Establish the foundation for Architecture v2.0

---

## Design Outcomes

### 1. Operational Data Platform Architecture Diagram

```
CURRENT STATE (v1.0)
─────────────────────────────────────────────────────

User (Admin/Coordinator)
         ↓
  Paste Excel URL
         ↓
  Backend validates URL
         ↓
  Microsoft Graph API
         ↓
  Download Excel
         ↓
  Parse & Validate
         ↓
  Update PostgreSQL
         ↓
  Dashboard reads PostgreSQL


FUTURE STATE (v2.0 – Cloud-Native)
──────────────────────────────────────────────────────

Admin
  ├─ Authenticate OAuth
  ├─ Browse OneDrive (via ODP)
  ├─ Select Master & Inventory workbooks (via ODP)
  └─ Configure relationship mapping (via ODP)
         │
         ↓
  Coordinator
  ├─ Edit Excel in OneDrive
  ├─ Save (OneDrive auto-sync)
  └─ Click "Publish Operational Data" (optional)
         │
         ↓
  Operational Data Platform (ODP) – NEW SUBSYSTEM
  │
  ├─ DataSourceManager
  │  └─ M365DataSource (OneDrive/Microsoft Graph)
  │
  ├─ ChangeDetector
  │  ├─ Workbook hash comparison
  │  ├─ Modified timestamp check
  │  └─ Schema version validation
  │
  ├─ SyncEngine
  │  ├─ Download workbook from Microsoft Graph
  │  ├─ Extract data from worksheets
  │  └─ Load into staging area
  │
  ├─ ValidationEngine
  │  ├─ Schema validation
  │  ├─ Required columns check
  │  ├─ Data type validation
  │  └─ Relationship validation
  │
  ├─ RelationshipDetector
  │  ├─ Auto-detect MV Track No. matching
  │  ├─ Generate confidence scores
  │  └─ Persist confirmed mappings
  │
  ├─ ImportPipeline
  │  ├─ Generate diff (INSERT/UPDATE/IGNORE)
  │  ├─ Start atomic transaction
  │  ├─ Apply to main tables
  │  └─ Rollback on error
  │
  ├─ AuditLogger
  │  └─ Record all changes
  │
  └─ Scheduler Integration
     ├─ Check changes every 10 min (configurable)
     ├─ If no changes: Sleep
     └─ If changes: Trigger sync
         │
         ↓
     PostgreSQL (Authoritative)
     ├─ Vehicle
     ├─ Inventory
     ├─ Customer
     ├─ Hub
     ├─ And all other operational tables
         │
         ↓
     Entire Application Reads from PostgreSQL
     ├─ Ticket Engine ✅
     ├─ Dashboard ✅
     ├─ Reports ✅
     ├─ WhatsApp ✅
     └─ Notifications ✅
```

---

### 2. Core Components & Responsibilities

#### OperationalDataPlatform (Orchestrator)
```typescript
// Coordinates all operations
class OperationalDataPlatform {
  // Configuration management
  async configureDataSource(config: DataSourceConfig): Promise<void>
  async updateWorkbookSelection(master: WorkbookSelection, inventory: WorkbookSelection): Promise<void>
  
  // Data browsing (for UI)
  async browseDrives(): Promise<Drive[]>
  async browseFolder(driveId: string, path: string): Promise<FileItem[]>
  async listWorkbooks(driveId: string, path: string): Promise<Workbook[]>
  
  // Synchronization
  async detectChanges(): Promise<boolean>
  async synchronize(): Promise<SyncResult>
  async publishNow(): Promise<SyncResult>
  
  // Status & reporting
  async getStatus(): Promise<PlatformStatus>
  async getSyncHistory(): Promise<SyncRecord[]>
  async getValidationReport(syncId: string): Promise<ValidationReport>
  
  // Health checks
  async healthCheck(): Promise<HealthStatus>
}
```

---

#### DataSourceManager (Abstraction)
```typescript
// Abstracts data source operations for extensibility
abstract class DataSource {
  abstract type: 'MICROSOFT_365' | 'ONEDRIVE' | 'SHAREPOINT' | 'GOOGLE_DRIVE' | 'CSV'
  
  // Configuration
  abstract authenticate(): Promise<void>
  abstract validateConnection(): Promise<boolean>
  abstract getMetadata(): Promise<SourceMetadata>
  
  // Discovery
  abstract listDrives(): Promise<Drive[]>
  abstract listFolders(path: string): Promise<Folder[]>
  abstract listFiles(path: string, filter: 'EXCEL'): Promise<File[]>
  
  // Data retrieval
  abstract downloadWorkbook(fileId: string): Promise<Buffer>
  abstract readWorksheet(workbook: Buffer, worksheetName: string): Promise<Row[]>
  abstract getWorkbookMetadata(fileId: string): Promise<WorkbookMetadata>
}

class M365DataSource extends DataSource {
  // Microsoft Graph implementation
  // Uses existing GraphAuthService
}

class DataSourceManager {
  private activeDataSource: DataSource
  
  async registerDataSource(type: string, config: any): Promise<void>
  async switchDataSource(type: string): Promise<void>
  async getActiveSource(): Promise<DataSource>
}
```

---

#### ChangeDetector (Smart Sync)
```typescript
class ChangeDetector {
  // Prevents unnecessary syncs
  async hasChanged(workbookId: string): Promise<{
    hasChanged: boolean
    reason: string
    details: ChangeDetails
  }>
  
  private async compareWorkbookVersion(current: string, previous: string): Promise<boolean>
  private async compareModifiedTime(current: Date, previous: Date): Promise<boolean>
  private async compareHash(current: string, previous: string): Promise<boolean>
  private async compareWorksheetHashes(current: string[], previous: string[]): Promise<boolean>
}

// Strategy: Only sync if ANY of these changed
// 1. Workbook version number
// 2. Modified timestamp (with 5-min threshold)
// 3. Worksheet structure hash
// 4. Data hash
```

---

#### ValidationEngine (Data Quality)
```typescript
class ValidationEngine {
  // Pre-sync validation
  async validateWorkbookStructure(workbook: Buffer): Promise<ValidationResult>
  async validateSchema(data: Row[], schema: Schema): Promise<ValidationResult>
  async validateRequiredColumns(data: Row[], columns: string[]): Promise<ValidationResult>
  async validateDataTypes(data: Row[], types: DataType[]): Promise<ValidationResult>
  async validateRelationships(masterRows: Row[], inventoryRows: Row[]): Promise<ValidationResult>
  
  // Returns: { isValid, errors: [...], warnings: [...] }
  // If invalid: Abort sync, rollback, log error
}
```

---

#### RelationshipDetector (AI/ML)
```typescript
class RelationshipDetector {
  // Auto-detect relationships
  async detectMVTrackNumberMapping(
    masterMvTrack: string[],
    inventoryMvTrack: string[]
  ): Promise<{
    confidenceScore: number
    mapping: Map<string, string>
    unmatchedMaster: string[]
    unmatchedInventory: string[]
  }>
  
  // Administrator confirms once
  // Persist and reuse automatically
}
```

---

#### ImportPipeline (Atomic Operations)
```typescript
class ImportPipeline {
  // Sequential stages
  async executeSync(syncConfig: SyncConfig): Promise<SyncResult> {
    // Stage 1: Download from Microsoft Graph
    const workbook = await this.downloadWorkbook()
    
    // Stage 2: Extract data
    const masterData = await this.extractWorksheet('Master', workbook)
    const inventoryData = await this.extractWorksheet('Inventory', workbook)
    
    // Stage 3: Validate
    await this.validateEngine.validateAll(masterData, inventoryData)
    
    // Stage 4: Detect changes
    const changes = await this.detectChanges(masterData, inventoryData)
    
    // Stage 5: Apply business rules
    const transformed = await this.applyBusinessRules(changes)
    
    // Stage 6: Generate diff
    const diff = await this.generateDiff(transformed)
    
    // Stage 7-10: Start transaction (ACID guaranteed)
    const result = await this.applyTransactional(diff)
    
    // Stage 11: Record history
    await this.recordSyncHistory(result)
    
    return result
  }
  
  private async applyTransactional(diff: Diff): Promise<SyncResult> {
    const transaction = await prismaClient.$transaction(async (tx) => {
      // All-or-nothing guarantee
      // If ANY operation fails: ROLLBACK all
      
      for (const insert of diff.inserts) {
        await tx.vehicle.create({ data: insert })
      }
      
      for (const update of diff.updates) {
        await tx.vehicle.update({ where: { id: update.id }, data: update.data })
      }
      
      // Return successful results
      return {
        rowsInserted: diff.inserts.length,
        rowsUpdated: diff.updates.length,
        rowsIgnored: diff.ignores.length
      }
    })
    
    return transaction
  }
}
```

---

### 3. Data Model (Prisma Schema Updates)

```prisma
// Extend existing schema

enum DataSourceType {
  MICROSOFT_365
  ONEDRIVE
  SHAREPOINT
  GOOGLE_DRIVE // Future
  CSV // Future
  REST_API // Future
}

enum SyncStatus {
  PENDING
  RUNNING
  SUCCESS
  PARTIAL_SUCCESS
  FAILED
}

model DataSource {
  id                String    @id @default(cuid())
  type              DataSourceType
  name              String
  config            Json      @default("{}")
  isActive          Boolean   @default(false)
  lastHealthCheck   DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  workbookMetadata  WorkbookMetadata[]
}

model WorkbookMetadata {
  id                    String    @id @default(cuid())
  dataSourceId          String
  dataSource            DataSource @relation(fields: [dataSourceId], references: [id])
  
  // Microsoft Graph identifiers
  driveId               String?
  itemId                String?
  resourceId            String?
  
  name                  String
  type                  String    @default("MASTER") // MASTER, INVENTORY
  version               String?
  fileSize              BigInt?
  
  // Change detection
  workbookHash          String?
  worksheetHash         String?
  modifiedTime          DateTime?
  
  // Metadata
  worksheetNames        String[]  @default([])
  selectedWorksheet     String?
  columnMapping         Json?
  relationshipMapping   Json?
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  lastSyncAt            DateTime?
  
  syncHistory           SyncHistory[]
}

model SyncHistory {
  id                    String    @id @default(cuid())
  workbookMetadataId    String
  workbookMetadata      WorkbookMetadata @relation(fields: [workbookMetadataId], references: [id])
  
  syncStartTime         DateTime
  syncEndTime           DateTime?
  duration              Int?      // milliseconds
  
  status                SyncStatus
  
  metrics {
    rowsRead            Int       @default(0)
    rowsInserted        Int       @default(0)
    rowsUpdated         Int       @default(0)
    rowsIgnored         Int       @default(0)
    relationshipMatches Int       @default(0)
  }
  
  errors                String?
  triggeredBy           String    // SCHEDULER, MANUAL, WEBHOOK
  triggeredByUser       String?   // User ID if manual
  
  validationReports     ValidationReport[]
  
  createdAt             DateTime  @default(now())
}

model ValidationReport {
  id                    String    @id @default(cuid())
  syncHistoryId         String
  syncHistory           SyncHistory @relation(fields: [syncHistoryId], references: [id])
  
  validationType        String    // SCHEMA, DATA, RELATIONSHIP
  status                String    // PASS, FAIL, WARNING
  message               String
  details               Json?     // Detailed error information
  
  createdAt             DateTime  @default(now())
}

model AuditTrail {
  id                    String    @id @default(cuid())
  entityType            String    // DataSource, Workbook, Sync, etc.
  entityId              String
  action                String    // CREATE, UPDATE, DELETE, PUBLISH, etc.
  changes               Json?     // Before/after comparison
  
  userId                String
  user                  User      @relation(fields: [userId], references: [id])
  
  ipAddress             String?
  userAgent             String?
  
  createdAt             DateTime  @default(now())
}

// Enhance existing AppSetting
model AppSetting {
  // ... existing fields ...
  
  // New v2.0 fields (backward compatible)
  dataSourceType        DataSourceType @default(MICROSOFT_365)
  driveId               String?        // OneDrive drive ID
  itemId                String?        // Workbook item ID
  resourceId            String?        // Microsoft Graph resource
  
  // Workbook metadata
  workbookVersion       String?
  workbookHash          String?
  lastWorkbookHash      String?
  
  // Sync scheduling
  nextScheduledSync     DateTime?
  syncChangeThreshold   Int            @default(5) // % threshold
  
  // Keep legacy fields for backward compatibility
  // masterWorkbookUrl, inventoryWorkbookUrl (deprecated but still present)
}
```

---

### 4. API Contracts (New Endpoints)

#### Authentication & Setup
```
POST /api/v1/operational-data/setup
Body: { setupType: 'MICROSOFT_365' }
Response: { authorizationUrl: string, state: string }

POST /api/v1/operational-data/setup/callback
Query: { code, state }
Response: { success: boolean, message: string }
```

#### OneDrive Browsing
```
GET /api/v1/operational-data/m365/drives
Auth: Required (Admin)
Response: {
  drives: [
    { driveId, driveName, ownerName, totalSize }
  ]
}

GET /api/v1/operational-data/m365/folders/:driveId?path=/root
Response: {
  folders: [
    { itemId, name, isFolder, modifiedTime, size }
  ]
}

GET /api/v1/operational-data/m365/workbooks/:driveId?path=/root
Response: {
  workbooks: [
    {
      itemId,
      name,
      webUrl,
      modifiedTime,
      size,
      worksheets: [{ name, id }]
    }
  ]
}
```

#### Workbook Selection
```
POST /api/v1/operational-data/select-workbook
Body: {
  type: 'MASTER' | 'INVENTORY',
  driveId,
  itemId,
  name,
  selectedWorksheet: string
}
Response: {
  workbookMetadataId,
  workbookName,
  worksheets: [...]
}
```

#### Relationship Configuration
```
POST /api/v1/operational-data/detect-relationships
Body: {
  masterWorkbookId,
  inventoryWorkbookId,
  masterRelationshipColumn: 'MV Track No.',
  inventoryRelationshipColumn: 'MV Track No.'
}
Response: {
  confidenceScore: 0.95,
  matches: 1234,
  unmatched: 56,
  suggestedMapping: {...}
}

POST /api/v1/operational-data/confirm-relationships
Body: { confirmed: true, mapping: {...} }
Response: { success: boolean }
```

#### Sync Management
```
GET /api/v1/operational-data/status
Response: {
  lastSync: timestamp,
  lastSyncStatus: 'SUCCESS' | 'FAILED',
  lastSyncDuration: 45000,
  rowsImported: 1234,
  nextScheduledSync: timestamp,
  schedulerStatus: 'RUNNING' | 'IDLE'
}

POST /api/v1/operational-data/publish
Auth: Required
Response: { syncHistoryId, message: 'Sync started...' }

GET /api/v1/operational-data/sync-history?limit=10&offset=0
Response: {
  syncs: [
    {
      id,
      startTime,
      endTime,
      duration,
      status,
      rowsInserted,
      rowsUpdated,
      rowsIgnored
    }
  ]
}

GET /api/v1/operational-data/sync-report/:syncHistoryId
Response: {
  sync: { ... full sync details ... },
  validationReports: [ ... ],
  errorLog: [ ... ]
}
```

---

### 5. Frontend Components (New)

#### OneDriveBrowser Component
```typescript
// Browse OneDrive folder structure
<OneDriveBrowser
  onSelectFile={(file) => handleFileSelection(file)}
  fileFilter="EXCEL"
/>
```

#### WorkbookSelector Component
```typescript
// Select master and inventory workbooks
<WorkbookSelector
  masterWorkbook={null}
  inventoryWorkbook={null}
  onSelect={(type, workbook) => handleSelect(type, workbook)}
/>
```

#### WorksheetSelector Component
```typescript
// Choose worksheets from selected workbooks
<WorksheetSelector
  workbooks={[masterWorkbook, inventoryWorkbook]}
  selections={selections}
  onConfirm={(selections) => handleConfirm(selections)}
/>
```

#### RelationshipConfirmation Component
```typescript
// Confirm auto-detected relationships
<RelationshipConfirmation
  suggestions={suggestions}
  onConfirm={(mapping) => handleConfirm(mapping)}
/>
```

#### PublishButton Component
```typescript
// Manual sync trigger
<PublishButton
  onClick={() => triggerManualSync()}
  loading={isSyncing}
  disabled={!isConfigured}
/>
```

#### StatusDashboard Component
```typescript
// Administrator platform status view
<StatusDashboard
  m365Status="CONNECTED"
  schedulerStatus="RUNNING"
  lastSync={lastSyncTime}
  nextSync={nextSyncTime}
  rowsImported={1234}
  errors={[]}
/>
```

---

### 6. Service Structure

```
backend/src/services/

├── operational-data/
│   ├── OperationalDataPlatform.ts       (NEW - Orchestrator)
│   ├── DataSourceManager.ts              (NEW - Abstraction)
│   ├── m365/
│   │   └── M365DataSource.ts            (NEW - Microsoft implementation)
│   ├── sync/
│   │   ├── ChangeDetector.ts            (NEW)
│   │   ├── SyncEngine.ts                (NEW)
│   │   ├── ImportPipeline.ts            (NEW)
│   │   └── ErrorRecovery.ts             (NEW)
│   ├── validation/
│   │   ├── ValidationEngine.ts          (NEW)
│   │   └── RelationshipDetector.ts      (NEW)
│   └── audit/
│       └── AuditLogger.ts               (NEW)
```

---

### 7. Repository Structure

```
backend/src/repositories/

├── OperationalDataRepository.ts         (NEW - ODP config)
├── DataSourceRepository.ts              (NEW - Data sources)
├── WorkbookMetadataRepository.ts        (NEW - Workbooks)
├── SyncHistoryRepository.ts             (NEW - Sync records)
├── ValidationReportRepository.ts        (NEW - Validation)
└── AuditTrailRepository.ts              (NEW - Audit log)
```

---

## Design Review Checklist

### Architecture
- [ ] Operational Data Platform as distinct subsystem
- [ ] DataSourceManager abstraction allows future sources
- [ ] No breaking changes to existing modules
- [ ] PostgreSQL remains authoritative database
- [ ] Cloud-native design (no local PC requirement)

### Database
- [ ] New tables designed for extensibility
- [ ] Backward compatibility maintained
- [ ] Migration path clear
- [ ] Indexes planned for performance
- [ ] Constraints ensure data integrity

### API
- [ ] REST conventions followed
- [ ] Error responses consistent
- [ ] Authentication required where needed
- [ ] Rate limiting considered
- [ ] Documentation complete

### Services
- [ ] Separation of concerns clear
- [ ] No duplicate logic across services
- [ ] Transaction management planned
- [ ] Error handling strategy defined
- [ ] Logging strategy defined

### Frontend
- [ ] User experience simplified for coordinator
- [ ] Admin experience clear and intuitive
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Mobile responsive

### Security
- [ ] OAuth tokens managed securely
- [ ] Audit trail captures all changes
- [ ] Role-based access enforced
- [ ] Secrets not logged
- [ ] SQL injection prevented (Prisma)

---

## Approval Checklist

Before proceeding to Phase 2, confirm:

- [ ] Executive review: Architecture aligns with business goals
- [ ] Technical review: Design is sound and extensible
- [ ] Database team: Schema changes approved
- [ ] Frontend team: UI/UX approach approved
- [ ] Security team: Security model approved
- [ ] DevOps: Infrastructure supports design
- [ ] QA: Testing strategy approved
- [ ] Product Owner: Requirements are met

---

## Phase 2 Readiness

Once Phase 1 approved:
1. Generate Prisma migration
2. Create service scaffolds
3. Create repository scaffolds
4. Create route stubs
5. Begin Phase 2 implementation

---

**Status:** Ready for Review & Approval

**Next Step:** Schedule architecture review meeting
