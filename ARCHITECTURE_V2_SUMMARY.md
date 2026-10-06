# MSPL Assist Architecture v2.0 – Executive Summary

**Status:** Design Complete, Ready for Implementation  
**Timeline:** 22–24 weeks (5–6 months)  
**Risk Level:** Medium (controlled, incremental)

---

## Vision: Cloud-Native Operational Data Platform

### Current State (v1.0)
- Coordinators manually paste SharePoint URLs
- Excel is the source of truth
- Limited automation
- Manual sync triggers
- No change detection

### Future State (v2.0)
- Admin browses OneDrive after OAuth
- PostgreSQL is the authoritative database
- Automatic change detection
- Scheduled sync (configurable 5/10/15/30 min, hourly, manual)
- "Publish Operational Data" button for manual sync
- Cloud-native (no local PC required)
- Extensible for future data sources

---

## Key Architectural Changes

### 1. New Operational Data Platform (ODP) Subsystem

A dedicated subsystem handles:
- Data source management (extensible)
- OneDrive browsing and file discovery
- Synchronization orchestration
- Change detection (smart sync)
- Validation (schema, data, relationships)
- Import pipeline (atomic transactions)
- Audit logging

### 2. Data Source Abstraction

```
DataSourceManager (Abstract)
  ├─ M365DataSource (Microsoft 365)
  ├─ OneDriveSource (Future)
  ├─ GoogleDriveSource (Future)
  ├─ CSVUploadSource (Future)
  └─ ERP ConnectorSource (Future)
```

Only **M365DataSource** implemented now.
Architecture supports future sources **without redesign**.

### 3. Smart Change Detection

Sync only when:
- Workbook version changed
- Modified timestamp changed (>5 min threshold)
- Worksheet structure changed
- Data hash changed

**Result:** Reduced network calls, faster scheduler, less database impact.

### 4. Atomic Import Pipeline

All-or-nothing guarantee:
- Download workbook
- Validate completely
- Generate diff (INSERT/UPDATE/IGNORE)
- Start transaction
- Apply all changes
- **If ANY error: Rollback entire transaction**

Result: No partial imports, no data corruption.

### 5. PostgreSQL as Authoritative Database

- Dashboard reads PostgreSQL (no change)
- Reports read PostgreSQL (no change)
- Tickets read PostgreSQL (no change)
- WhatsApp reads PostgreSQL (no change)
- **Excel is import source only**

---

## 10-Phase Implementation

| Phase | Focus | Duration | Effort |
|-------|-------|----------|--------|
| 1 | Architecture & Design | 2–3 days | Design |
| 2 | Operational Data Platform Core | 3–4 weeks | High |
| 3 | OneDrive Browsing | 2–3 weeks | High |
| 4 | Change Detection | 1–2 weeks | Medium |
| 5 | Relationship Engine | 2–3 weeks | Medium |
| 6 | Import Pipeline | 2–3 weeks | High |
| 7 | Publish Button | 1 week | Low |
| 8 | Admin Status Dashboard | 1–2 weeks | Medium |
| 9 | Audit & Compliance | 1 week | Low |
| 10 | Testing & Validation | 2–3 weeks | High |

---

## What Gets Built

### New Services
- `OperationalDataPlatform` (orchestrator)
- `DataSourceManager` (abstraction)
- `M365DataSource` (Microsoft implementation)
- `ChangeDetector` (smart sync)
- `ValidationEngine` (data quality)
- `RelationshipDetector` (AI matching)
- `ImportPipeline` (atomic import)
- `AuditLogger` (compliance)

### New Database Tables
- `DataSource` (extensible)
- `WorkbookMetadata` (versioning)
- `SyncHistory` (detailed records)
- `ValidationReport` (per-sync)
- `AuditTrail` (who did what)

### New Frontend Components
- `OneDriveBrowser` (folder hierarchy)
- `WorkbookSelector` (select files)
- `WorksheetSelector` (choose sheets)
- `RelationshipConfirmation` (confirm matches)
- `PublishButton` (manual sync)
- `StatusDashboard` (admin view)

### New API Endpoints
- `GET /api/v1/operational-data/m365/drives`
- `GET /api/v1/operational-data/m365/folders/{driveId}`
- `GET /api/v1/operational-data/m365/workbooks/{driveId}`
- `POST /api/v1/operational-data/select-workbook`
- `POST /api/v1/operational-data/detect-relationships`
- `POST /api/v1/operational-data/publish`
- `GET /api/v1/operational-data/status`
- `GET /api/v1/operational-data/sync-history`

---

## What Doesn't Change

✅ React Frontend Architecture  
✅ Node/Express Backend Framework  
✅ Prisma ORM  
✅ PostgreSQL  
✅ Authentication & Authorization  
✅ Login Flow  
✅ Ticket Engine  
✅ Customer Module  
✅ Dashboard (queries PostgreSQL still)  
✅ Reports (queries PostgreSQL still)  
✅ WhatsApp Integration  
✅ Notification Engine  
✅ Existing APIs  
✅ Existing Database Tables (enhanced, not replaced)

---

## Coordinator Workflow (Simplified)

### Before (v1.0)
1. Admin pastes SharePoint URL
2. Admin clicks "Validate"
3. Admin waits for validation
4. Admin configures mapping manually
5. Scheduler runs sync (if configured)
6. Coordinator's PC must stay on

### After (v2.0)
1. Coordinator edits Excel in OneDrive
2. Saves workbook
3. **Background:** Scheduler detects changes
4. **Automatic:** Data syncs to PostgreSQL
5. **Optional:** Click "Publish Operational Data" for immediate sync
6. Done! ✅

Coordinator never thinks about SQL, PostgreSQL, Microsoft Graph, or URLs.

---

## Technical Highlights

### 1. Extensible Architecture
```
┌─────────────────────────────────┐
│  Operational Data Platform      │
├─────────────────────────────────┤
│  DataSourceManager              │
│  ├─ M365DataSource (now)        │
│  ├─ GoogleDriveSource (future)  │
│  ├─ CSVUploadSource (future)    │
│  └─ ERP ConnectorSource (future)│
└─────────────────────────────────┘
```
Add new sources by implementing one interface.

### 2. Smart Scheduler
```
Every 10 minutes:
  1. Check if workbook changed
  2. If NO changes: Sleep
  3. If YES changes: Sync
  Result: No unnecessary network calls
```

### 3. Atomic Transactions
```
BEGIN TRANSACTION
  INSERT new rows
  UPDATE existing rows
  DELETE removed rows
COMMIT
(If any fails: ROLLBACK all)
```

### 4. Audit Trail
```
Every action logged:
- Who changed it
- What changed
- When it changed
- IP address
- User agent
```

### 5. Relationship Auto-Detection
```
Automatically match:
- MV Track No.
- Vehicle Number
- Other relationship columns

Admin confirms once.
Reuse automatically.
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Data loss during import | Transaction rollback, audit trail, backup before sync |
| Sync deadlocks | Advisory locks, timeout handling, cleanup |
| Graph API rate limiting | Exponential backoff, caching, quota monitoring |
| Schema mismatches | Strict validation, version checking, detailed errors |
| Coordinator confusion | Simple UI, clear labels, progress indicators |
| Performance degradation | Change detection, selective sync, query optimization |
| Breaking existing features | No changes to existing services, only extensions |

---

## Success Criteria

### Functional
- ✅ OneDrive browsing works (no URL pasting)
- ✅ Automatic change detection works
- ✅ Scheduled sync works (5/10/15/30/60 min)
- ✅ Manual "Publish" button works
- ✅ Relationship detection works
- ✅ PostgreSQL reflects all changes
- ✅ All existing modules read from PostgreSQL
- ✅ No regressions in existing features

### Performance
- ✅ Scheduler detects changes in <1 second
- ✅ Sync completes in <2 minutes (typical)
- ✅ No deadlocks or transaction timeouts
- ✅ Database queries remain sub-second

### Quality
- ✅ 80%+ code coverage (tests)
- ✅ 0 data corruption incidents
- ✅ 100% audit trail coverage
- ✅ UAT sign-off obtained

---

## Next Steps

### Immediate (Today)
1. ✅ Review this summary
2. ✅ Review Phase 1 design document
3. ✅ Confirm architectural direction

### This Week
1. Schedule architecture review meeting
2. Get stakeholder approval (tech, product, security)
3. Finalize database schema
4. Finalize API contracts

### Next Week
1. Begin Phase 1 deliverables (detailed design)
2. Create Prisma migration
3. Create service scaffolds
4. Begin Phase 2 planning

---

## Investment Summary

| Aspect | Details |
|--------|---------|
| **Timeline** | 22–24 weeks (5–6 months) |
| **Effort** | 2–3 FTE |
| **Cost** | TBD (based on team rates) |
| **Risk** | Medium (controlled, incremental) |
| **ROI** | High (scalable, maintainable, future-proof) |
| **Break-even** | After first year (automation, efficiency) |

---

## Competitive Advantage

✅ **Cloud-native** — Coordinator PC doesn't need to be powered on  
✅ **Automatic** — No manual intervention for routine syncs  
✅ **Extensible** — Add new data sources without rework  
✅ **Intelligent** — Change detection prevents wasted effort  
✅ **Transparent** — Full audit trail for compliance  
✅ **Reliable** — Atomic transactions ensure data integrity  

---

## Conclusion

MSPL Assist will evolve from a coordinator-centric tool into a true **cloud-native Operational Data Platform**.

- **PostgreSQL** becomes the authoritative system database
- **Excel** remains the familiar editing interface
- **Synchronization** becomes automatic and intelligent
- **Architecture** becomes extensible for future growth

This is a **controlled, incremental evolution** that preserves all existing functionality while modernizing the platform.

---

**Status:** ✅ Design Complete, Ready for Approval

**Questions?** Schedule architecture review meeting

**Next Step:** Confirm direction and begin Phase 1 detailed design
