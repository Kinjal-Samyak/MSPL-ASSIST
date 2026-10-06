# Workshop Lifecycle

## Coordinator path

```text
Ticket created -> Workshop Case / Coordinator Review
  -> Resolved by Coordinator -> Close
  OR Assign Technician
       -> Consultation -> Resolved after Consultation -> Close
       OR Workshop Repair Required -> Automatic Job Card
```

Coordinator review validation: Ticket identity, physical vehicle, deployment/hub context, complaint evidence, and duplicate active-case check must be available. A resolution requires a recorded outcome and remarks. Assignment requires an active eligible technician and scope validation.

## Technician and Job Card path

```text
Draft -> Assigned -> Inspection -> Diagnosis -> Repair
                                -> Waiting for Spare (repair substate, optional)
                             -> Quality Check
                                -> fail: Repair (rework event)
                                -> pass: Ready -> Delivered -> Closed
```

- Inspection needs findings/notes; attachments are optional evidence.
- Diagnosis needs a recorded fault and recommended action.
- Repair records tasks, labour, parts usage where applicable, and completion notes.
- Quality Check uses the applicable checklist; a failure must include a reason and triggers rework.
- Ready is declared by the technician; no Hub or Operations approval step is added.
- Delivery is recorded by the approved vehicle assignment/delivery integration. It ends RFD Idle Time.

## Consultation path

A technician can request consultation before a Job Card. The request records a question and evidence; the consultant records an outcome; the technician/coordinator records acceptance. If resolved remotely, the Case moves to `RESOLVED_AFTER_CONSULTATION` and can close without a Job Card. Consultation never resets downtime clocks.

## Timeline event contract

Every transition emits one event with server time, actor, entity, prior/new status, remarks, and correlation ID. Required events: coordinator reviewed, case resolved, technician assigned/reassigned, consultation requested/responded/resolved, job card created, inspection completed, diagnosis recorded, repair started/completed/blocked, QC passed/failed, ready, delivered, and closed.

## Clock rules

| Measure | Start | End |
| --- | --- | --- |
| Workshop downtime | Ticket created | Ready declared |
| Technician response | Ticket created | Technician assigned |
| RFD idle time | Ready declared | Vehicle assigned/delivered |

Vehicle Received is a timeline milestone only; it never starts or stops a clock.
