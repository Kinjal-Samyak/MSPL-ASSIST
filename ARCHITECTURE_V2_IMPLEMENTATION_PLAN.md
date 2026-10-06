# MSPL Assist – Architecture v2.0 Implementation Plan

**Date:** July 14, 2026  
**Status:** Planning & Design Phase  
**Objective:** Transform into a cloud-native Operational Data Platform

---

## Executive Summary

MSPL Assist will evolve into a true cloud platform where:

- **PostgreSQL is the authoritative database** (not Excel)
- **Operational Data Platform** becomes a dedicated subsystem for import/sync
- **Coordinator workflow** is simplified: Edit Excel → Auto-sync → Auto-publish
- **OneDrive browsing** replaces manual URL pasting
- **Change detection** prevents unnecessary synchronization
- **Extensible architecture** supports future data sources

All existing functionality is preserved. No breaking changes.

---

## Phase-Based Implementation Strategy

### Phase 1: Architecture Assessment & Planning
**Goal:** Understand current state, identify gaps, propose design

**Deliverables:**
1. Architecture diagram (current vs. future)
2. Data model refinement
3. Module dependency analysis
4. API contract updates
5. Prisma schema enhancements
6. Implementation roadmap

**Effort:** 2-3 days (design only, no code yet)  
**Risk:** Low (assessment phase)

---

### Phase 2: Operational Data Platform Core
**Goal:** Create the new subsystem foundation

**Components to Build:**
1. `OperationalDataPlatform` service (orchestrator)
2. `DataSourceManager` (abstraction for data sources)
3. `M365DataSource` (Microsoft 365 connector)
4. `SyncEngine` (synchronization orchestration)
5. `ChangeDetector` (hash-based change detection)
6. `ValidationEngine` (schema, data, relationship validation)

**Database Enhancements:**
- `DataSource` table (extensible for future sources)
- `DataSourceConfig` table (OneDrive folder ID, drive ID, etc.)
- `WorkbookMetadata` table (versioning, hashes, timestamps)
- `SyncHistory` table (detailed sync records)
- `ValidationReport` table (per-sync validation details)

**Frontend Features:**
- OneDrive folder browser (after OAuth)
- Workbook selection UI
- Worksheet selection UI

**Effort:** 3-4 weeks  
**Risk:** Medium (new subsystem, core to functionality)

---

### Phase 3: Microsoft 365 Integration (OneDrive Browsing)
**Goal:** Replace URL pasting with interactive browsing

**Components:**
1. `OneDriveBrowser` service
2. `M365FileExplorer` component
3. `WorkbookSelector` component
4. `WorksheetSelector` component

**API Endpoints:**
- `GET /api/v1/operational-data/m365/drives` — List user's drives
- `GET /api/v1/operational-data/m365/folders/{driveId}` — Browse folders
- `GET /api/v1/operational-data/m365/workbooks/{driveId}` — List Excel files
- `POST /api/v1/operational-data/m365/select-workbook` — Store selection

**Database Changes:**
- Store: Drive ID, Item ID, Resource ID (not URL)
- Store: Workbook metadata from Graph API

**Effort:** 2-3 weeks  
**Risk:** Medium (Graph API integration)

---

### Phase 4: Change Detection & Smart Scheduling
**Goal:** Avoid unnecessary syncs, improve performance

**Components:**
1. `ChangeDetector` service (hash-based)
2. `MetadataComparator` (workbook version, modified time)
3. Enhanced `Scheduler` logic

**Detection Strategy:**
- Compare workbook version
- Compare modified timestamp
- Hash worksheet schemas
- Hash row counts
- Only sync if changes detected

**Database:**
- `WorkbookMetadata.workbookHash`
- `WorkbookMetadata.worksheetHash`
- `WorkbookMetadata.versionNumber`
- `WorkbookMetadata.lastModified`

**Effort:** 1-2 weeks  
**Risk:** Low (standalone feature)

---

### Phase 5: Enhanced Validation & Relationship Engine
**Goal:** Automatic relationship detection with confidence scores

**Components:**
1. Enhanced `ValidationEngine`
2. `RelationshipDetector` (AI/ML for MV Track No. matching)
3. `RelationshipConfirmation` UI

**Features:**
- Automatic column detection (MV Track No., Vehicle Number, etc.)
- Confidence scoring
- Administrator confirmation (once)
- Persist mapping

**Effort:** 2-3 weeks  
**Risk:** Medium (ML/matching logic)

---

### Phase 6: Import Pipeline & Transaction Management
**Goal:** Reliable data import with rollback capability

**Components:**
1. Enhanced `SyncEngine`
2. `ImportPipeline` (sequential stages)
3. `TransactionManager` (atomic operations)
4. `ErrorRecovery` (rollback on failure)

**Pipeline Stages:**
```
1. Download workbook from Microsoft Graph
2. Validate workbook structure
3. Validate schema version
4. Load data into staging tables
5. Validate relationships
6. Apply business rules
7. Generate diff (INSERT/UPDATE/IGNORE)
8. Start transaction
9. Apply changes to main tables
10. Commit transaction
11. Record sync history
12. Generate report
```

**Effort:** 2-3 weeks  
**Risk:** High (critical path for data integrity)

---

### Phase 7: Publish Operational Data Button
**Goal:** On-demand synchronization

**Components:**
1. Frontend button on dashboard/settings
2. API endpoint: `POST /api/v1/operational-data/publish`
3. Trigger immediate sync (outside scheduler)

**UI/UX:**
- Button disabled during sync
- Progress indicator
- Sync result notification
- Link to sync report

**Effort:** 1 week  
**Risk:** Low (wrapper around existing sync)

---

### Phase 8: Platform Status Dashboard
**Goal:** Administrator visibility into platform health

**Components:**
1. New `AdminDashboard` component
2. Status indicators
3. Sync history visualization
4. Error reporting

**Displays:**
- Microsoft 365 connection status
- Data source health
- Scheduler status
- Last sync details
- Next sync time
- Workbook status
- Error summary

**Effort:** 1-2 weeks  
**Risk:** Low (UI only)

---

### Phase 9: Audit & Compliance
**Goal:** Track all changes for compliance

**Components:**
1. `AuditLogger` service
2. `AuditTrail` table (who, what, when, why)
3. `SyncAuditReport` generator

**Logs:**
- Configuration changes
- Sync initiations
- Data transformations
- Errors
- Manual publishes

**Effort:** 1 week  
**Risk:** Low (logging infrastructure)

---

### Phase 10: Testing & Validation
**Goal:** Verify architecture v2.0 works end-to-end

**Test Scenarios:**
1. Login → OAuth → Browse OneDrive → Select workbooks
2. Automatic detection of changes → Sync triggered
3. Manual publish button → Immediate sync
4. Change detection → No sync when no changes
5. Validation failure → Sync aborted, rollback
6. Relationship detection → Automatic matching
7. PostgreSQL reflects all changes
8. Existing modules (tickets, reports, etc.) read from PostgreSQL
9. Scheduler with 5/10/15/30/60 min intervals
10. WhatsApp integration works (reads PostgreSQL only)

**Effort:** 2-3 weeks  
**Risk:** High (integration testing)

---

## Current State Assessment

### ✅ What Already Exists

- React frontend with settings page
- Node/Express backend
- Prisma ORM with PostgreSQL
- Authentication & authorization
- Microsoft Graph OAuth (implemented)
- Basic sync scheduler
- Workbook validation (partially)
- Ticket, customer, dashboard, reports modules

### ⚠️ What Needs Enhancement

- OneDrive browsing UI (currently URL paste-based)
- Change detection logic (missing)
- Relationship engine (basic only)
- Import pipeline (needs refinement)
- Sync history tracking (basic only)
- Error recovery (partial)
- Status dashboard (missing)
- Audit logging (basic only)

### ❌ What Needs to Be Built

- `OperationalDataPlatform` service (orchestrator)
- `DataSourceManager` abstraction
- `M365DataSource` implementation
- `OneDriveBrowser` service
- `ChangeDetector` service
- Enhanced `ValidationEngine`
- Enhanced `RelationshipDetector`
- Enhanced `ImportPipeline`
- `PublishOperationalData` endpoint
- Platform status dashboard
- Enhanced audit logging

---

## Database Schema Changes

### New Tables

```sql
-- Data source configuration (extensible)
CREATE TABLE DataSource (
  id UUID PRIMARY KEY,
  type ENUM('MICROSOFT_365', 'ONEDRIVE', 'SHAREPOINT', ...),
  name VARCHAR,
  config JSONB, -- driver-specific config
  status ENUM('ACTIVE', 'INACTIVE', 'ERROR'),
  lastHealthCheck TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- Workbook metadata & versioning
CREATE TABLE WorkbookMetadata (
  id UUID PRIMARY KEY,
  dataSourceId UUID,
  driveId VARCHAR,
  itemId VARCHAR,
  resourceId VARCHAR,
  name VARCHAR,
  version VARCHAR,
  hash VARCHAR,
  worksheetHash VARCHAR,
  modifiedTime TIMESTAMP,
  fileSize BIGINT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (dataSourceId) REFERENCES DataSource(id)
);

-- Detailed sync history
CREATE TABLE SyncHistory (
  id UUID PRIMARY KEY,
  workbookMetadataId UUID,
  syncStartTime TIMESTAMP,
  syncEndTime TIMESTAMP,
  duration BIGINT, -- ms
  status ENUM('SUCCESS', 'FAILED', 'PARTIAL'),
  rowsRead INT,
  rowsInserted INT,
  rowsUpdated INT,
  rowsIgnored INT,
  errors TEXT,
  triggeredBy ENUM('SCHEDULER', 'MANUAL', 'WEBHOOK'),
  createdBy UUID,
  createdAt TIMESTAMP,
  FOREIGN KEY (workbookMetadataId) REFERENCES WorkbookMetadata(id),
  FOREIGN KEY (createdBy) REFERENCES User(id)
);

-- Validation reports per sync
CREATE TABLE ValidationReport (
  id UUID PRIMARY KEY,
  syncHistoryId UUID,
  validationType ENUM('SCHEMA', 'DATA', 'RELATIONSHIP'),
  status ENUM('PASS', 'FAIL', 'WARNING'),
  message TEXT,
  details JSONB,
  createdAt TIMESTAMP,
  FOREIGN KEY (syncHistoryId) REFERENCES SyncHistory(id)
);

-- Audit trail
CREATE TABLE AuditTrail (
  id UUID PRIMARY KEY,
  entityType VARCHAR,
  entityId UUID,
  action VARCHAR,
  changes JSONB,
  userId UUID,
  ipAddress VARCHAR,
  userAgent VARCHAR,
  createdAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id)
);
```

### Modified Tables

```sql
-- Add to AppSetting
ALTER TABLE AppSetting ADD COLUMN dataSourceType VARCHAR DEFAULT 'MICROSOFT_365';
ALTER TABLE AppSetting ADD COLUMN driveId VARCHAR; -- OneDrive drive ID
ALTER TABLE AppSetting ADD COLUMN itemId VARCHAR; -- Workbook item ID
ALTER TABLE AppSetting ADD COLUMN resourceId VARCHAR; -- Microsoft Graph resource ID
ALTER TABLE AppSetting ADD COLUMN workbookVersion VARCHAR;
ALTER TABLE AppSetting ADD COLUMN lastWorkbookHash VARCHAR;
ALTER TABLE AppSetting ADD COLUMN nextScheduledSync TIMESTAMP;
ALTER TABLE AppSetting ADD COLUMN syncChangeThreshold INT DEFAULT 5; -- % threshold

-- Keep existing columns for backward compatibility
-- masterWorkbookUrl, inventoryWorkbookUrl still present but marked as "legacy"
```

---

## API Contracts (New Endpoints)

### OneDrive Browsing

```
GET /api/v1/operational-data/m365/drives
Response: { drives: [{ driveId, driveName, owner }] }

GET /api/v1/operational-data/m365/folders/:driveId?path=/root
Response: { folders: [{ itemId, name, isFolder }] }

GET /api/v1/operational-data/m365/workbooks/:driveId?path=/root
Response: { workbooks: [{ itemId, name, worksheets: [...] }] }

POST /api/v1/operational-data/m365/select-workbook
Body: { driveId, itemId, resourceId, name, workbookType: 'MASTER'|'INVENTORY' }
Response: { workbookMetadataId, worksheets: [...] }
```

### Sync Management

```
POST /api/v1/operational-data/publish
Response: { syncHistoryId, status, message }

GET /api/v1/operational-data/sync-status
Response: { lastSync, nextSync, status, rowsImported, errors: [...] }

GET /api/v1/operational-data/sync-history?limit=10
Response: { syncs: [{ id, startTime, duration, status, rowsImported }] }

GET /api/v1/operational-data/sync-report/:syncHistoryId
Response: { sync details, validation reports, error log }
```

### Admin Dashboard

```
GET /api/v1/admin/operational-platform/status
Response: {
  m365Status: 'CONNECTED'|'DISCONNECTED',
  dataSourceHealth: 'HEALTHY'|'WARNING'|'ERROR',
  schedulerStatus: 'RUNNING'|'STOPPED',
  lastSync: timestamp,
  nextSync: timestamp,
  workbookStatus: 'HEALTHY'|'OUTDATED'|'ERROR',
  rowsImported: 1234,
  syncDuration: 45000, // ms
  lastValidation: timestamp,
  errorCount: 0
}
```

---

## Service Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────┐
│         Frontend (React)                     │
│  - OneDriveBrowser                          │
│  - WorkbookSelector                         │
│  - WorksheetSelector                        │
│  - PublishButton                            │
│  - StatusDashboard                          │
└────────────┬────────────────────────────────┘
             │ HTTP APIs
┌────────────▼────────────────────────────────┐
│       Express Routes                         │
│  /operational-data/* routes                 │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│  Controllers (Request Handlers)             │
│  - OperationalDataController                │
│  - M365DataSourceController                 │
│  - SyncController                           │
│  - AdminDashboardController                 │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│    Operational Data Platform (NEW)          │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  OperationalDataPlatform             │  │
│  │  (Orchestrator/Coordinator)          │  │
│  └──────────────────────────────────────┘  │
│           ↓                                  │
│  ┌──────────────────────────────────────┐  │
│  │  DataSourceManager (Abstract)        │  │
│  │  - Register data sources             │  │
│  │  - Switch data source type           │  │
│  │  - Get active data source            │  │
│  └──────────────────────────────────────┘  │
│           ↓                                  │
│  ┌──────────────────────────────────────┐  │
│  │  M365DataSource (Implementation)     │  │
│  │  - Browse OneDrive                   │  │
│  │  - Download workbook                 │  │
│  │  - Get workbook metadata             │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Core Services (Used by Platform)    │  │
│  │  - ChangeDetector                    │  │
│  │  - ValidationEngine                  │  │
│  │  - RelationshipDetector              │  │
│  │  - ImportPipeline                    │  │
│  │  - SyncEngine                        │  │
│  │  - ErrorRecovery                     │  │
│  │  - AuditLogger                       │  │
│  └──────────────────────────────────────┘  │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│  Repositories (Data Access)                 │
│  - OperationalDataRepository                │
│  - DataSourceRepository                     │
│  - WorkbookMetadataRepository               │
│  - SyncHistoryRepository                    │
│  - ValidationReportRepository               │
│  - AuditTrailRepository                     │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│      PostgreSQL Database                    │
│  - OperationalData (current)                │
│  - DataSource (new)                         │
│  - WorkbookMetadata (new)                   │
│  - SyncHistory (new)                        │
│  - ValidationReport (new)                   │
│  - AuditTrail (new)                         │
└─────────────────────────────────────────────┘
```

---

## Integration Points (Preserve Existing)

### Ticket Engine
- **Current:** Reads from any source (Excel or PostgreSQL)
- **Future:** Reads from PostgreSQL only (via `Vehicle`, `Customer` tables)
- **Change:** Add migration script to backfill data from Excel to PostgreSQL

### Customer Module
- **Current:** Manages customers
- **Future:** Populated by Operational Data Platform sync
- **Change:** Make sync update customer records

### Dashboard
- **Current:** Queries PostgreSQL
- **Future:** Queries PostgreSQL (no change needed)

### Reports
- **Current:** Queries PostgreSQL
- **Future:** Queries PostgreSQL (no change needed)

### WhatsApp
- **Current:** Queries PostgreSQL
- **Future:** Queries PostgreSQL (no change needed)

### Notifications
- **Current:** Triggered by various events
- **Future:** Add triggers for sync events (e.g., "New customer added via sync")

---

## Risk Mitigation

### High-Risk Areas

| Risk | Mitigation |
|------|-----------|
| Data loss during import | Transaction rollback, audit trail, backup before sync |
| Sync deadlocks | Advisory locks, timeout handling, cleanup |
| Microsoft Graph rate limiting | Exponential backoff, caching, quota monitoring |
| Schema mismatches | Strict validation, version checking, detailed error reports |
| Coordinator confusion | Simple UI, clear button labels, progress indicators |
| Performance degradation | Change detection, selective sync, query optimization |

---

## Success Criteria

### Phase 1 Complete
- [ ] Architecture diagram finalized
- [ ] Data model approved
- [ ] API contracts documented
- [ ] Prisma schema changes reviewed
- [ ] Implementation roadmap confirmed

### Phase 2 Complete
- [ ] Operational Data Platform service built
- [ ] DataSourceManager abstraction works
- [ ] M365DataSource implementation done
- [ ] Basic sync engine functional
- [ ] All new tables created and working

### Phase 10 Complete (Full v2.0)
- [ ] All 10 phases implemented
- [ ] End-to-end testing passes
- [ ] No regressions in existing modules
- [ ] Performance benchmarks met
- [ ] UAT sign-off obtained
- [ ] Documentation complete

---

## Timeline Estimate

| Phase | Duration | Total |
|-------|----------|-------|
| 1. Planning | 2-3 days | 2-3 days |
| 2. Platform Core | 3-4 weeks | 5-6 weeks |
| 3. OneDrive Browsing | 2-3 weeks | 8-9 weeks |
| 4. Change Detection | 1-2 weeks | 10-11 weeks |
| 5. Relationship Engine | 2-3 weeks | 13-14 weeks |
| 6. Import Pipeline | 2-3 weeks | 16-17 weeks |
| 7. Publish Button | 1 week | 17-18 weeks |
| 8. Status Dashboard | 1-2 weeks | 19-20 weeks |
| 9. Audit & Compliance | 1 week | 20-21 weeks |
| 10. Testing & Validation | 2-3 weeks | 22-24 weeks |

**Total: 22-24 weeks (5-6 months)**

---

## Next Steps

1. **Review this plan** — Confirm architectural direction
2. **Approve data model** — Finalize database changes
3. **Finalize API contracts** — Define exact endpoints
4. **Begin Phase 1** — Detailed architecture design
5. **Proceed incrementally** — Complete one phase before starting next

---

**Status:** Ready for discussion and approval

**Next Review Date:** Upon plan approval
