# Workshop Integrations, Notifications, and Reporting

## Integration boundaries

| Integration | Workshop consumes | Workshop emits | Constraint |
| --- | --- | --- | --- |
| Ticket Module | Ticket ID, Rider/vehicle/deployment references, complaint | Case outcome, closure request, timeline correlation | Existing Ticket APIs remain compatible |
| Conversation Workflow | Created Ticket outcome only | None directly | Workflow remains channel-independent |
| Notification Engine | Existing policy/channel/template configuration | Domain notification events | Failure does not roll back an operational transition |
| Authentication | Authenticated user, role, hub scope | Audited actor reference | Server-side permission enforcement |
| WhatsApp/Mobile (future) | Channel adapter input | Status-safe Rider updates | No workflow duplication |
| Analytics/Reporting | Append-only workshop facts | KPI-ready events/projections | No dashboard is introduced in Phase 1 |

## Notification events (design only)

Technician assigned; consultation completed; Job Card created; repair started; repair completed; QC completed/failed; Ready; Delivered; and Ticket closed. Each event includes Ticket/Case correlation, vehicle reference, current status, actor/time, and approved Rider-facing text where applicable. Notifications follow existing enabled-channel/template rules.

## Reporting requirements

Future reports and dashboards must derive from Case/Job Card/timeline facts and support:

- Open Workshop Cases and ageing.
- Technician workload, assignment response time, and consultation resolution time.
- Workshop downtime, turnaround time, and RFD Idle Time.
- First-time fix rate and repeat-failure frequency by vehicle/model/category.
- Repair/parts workload, QC failure/rework rate, and pending deliveries.
- SLA compliance, audit completeness, and notification delivery outcomes.

KPI definitions must name their timestamp sources and filters. They must not infer results from mutable display status alone.
