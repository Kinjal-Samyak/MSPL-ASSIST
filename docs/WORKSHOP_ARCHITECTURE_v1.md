# Workshop Architecture v1.0

> **Status: Frozen Workshop Domain Design (Phase 1).** This is a documentation-only design baseline. It creates no production behaviour, endpoint, database model, migration, or screen.

## Scope and boundary

The Ticket Module owns Rider-facing ticket creation and the Ticket’s customer-facing record. The Workshop Module begins after a Ticket is successfully created and owns coordinator review, workshop execution, internal audit, and the operational hand-off to delivery.

```text
Ticket
  -> Workshop Case
       -> Coordinator review
       -> remote resolution OR technician assignment
       -> consultation resolution OR repair-required decision
       -> Job Card
       -> inspection -> diagnosis -> repair -> quality check
       -> ready -> delivery -> closure
```

`MotorNo.` identifies the physical vehicle. Rider Phone Number identifies the Rider. The Workshop Module references existing Ticket, Rider, Vehicle, Deployment, Hub, and User records; it does not duplicate them.

## Core architecture decisions

- A **Workshop Case** is the parent operational record for one Ticket.
- A Workshop Case is created automatically after Ticket creation as an auditable coordinator-work queue item.
- A **Job Card is not created merely because a Ticket exists**. It is created automatically and transactionally only when the recorded outcome is **Workshop Repair Required**.
- A remote/coordinator resolution requires no Job Card and can close the Case/Ticket through the existing Ticket lifecycle integration.
- Job Card lower-level stages are internal work records. The current operational presentation remains limited to the approved Workshop-facing statuses; no new end-user workflow is introduced by this design.
- Technician readiness is a technician authority. Coordinator or Hub approval must not become an additional gate.
- Timestamps, actors, and remarks are append-only audit facts. Derived durations are calculated from those facts, never manually entered.

## Documentation map

| Document | Authority |
| --- | --- |
| [WORKSHOP_DOMAIN_MODEL.md](WORKSHOP_DOMAIN_MODEL.md) | Entities, relationships, ownership, and business invariants |
| [WORKSHOP_STATUS_MODEL.md](WORKSHOP_STATUS_MODEL.md) | Case, Job Card, and stage state models and transition ownership |
| [WORKSHOP_LIFECYCLE.md](WORKSHOP_LIFECYCLE.md) | Coordinator/technician paths, entry/exit criteria, and timeline |
| [WORKSHOP_PERMISSIONS.md](WORKSHOP_PERMISSIONS.md) | Future role matrix and data-scope rules |
| [WORKSHOP_INTEGRATIONS.md](WORKSHOP_INTEGRATIONS.md) | Tickets, workflow engine, notifications, channels, and reporting |

## Implementation constraints

Future implementation must use additive schema changes, backwards-compatible endpoints, existing authentication, shared platform packages, service/repository boundaries, transactions, and immutable audit records. It must not change Microsoft Graph, synchronization, existing Ticket APIs, or Fleet Operations state logic without separate approval.
