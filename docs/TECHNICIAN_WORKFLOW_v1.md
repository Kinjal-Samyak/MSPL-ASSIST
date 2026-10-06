# Technician Workflow v1

## Frozen workflow

```text
Assigned -> Vehicle Received -> Inspection Started -> Inspection Completed
-> Repair Started -> Waiting for Parts -> Repair Completed -> Quality Check
-> Ready for Delivery
```

Technicians act through guided actions; they never choose arbitrary statuses. Each future action will validate the allowed predecessor and create an immutable activity entry.

## Implementation status

- Implemented: assigned-job visibility, MV Track first search, inventory-backed asset and complaint view, Administrator and Technician access, controlled milestone progression, inspection, repair notes, immutable activity timeline and photo-reference extension point. These use existing Ticket activity and attachment persistence.
- Completion: “Ready for Delivery” is only reachable after inspection and at least one repair note. The prior required milestones must have been completed through guided actions.
- Implemented: repair-history presentation by MV Track Number. Full file storage integration remains deferred; the console uses the existing attachment record with an external photo reference.

Parts remains intentionally absent from the workflow. The UI exposes only a clear future extension point; it cannot reserve, issue, deduct, or price inventory.
