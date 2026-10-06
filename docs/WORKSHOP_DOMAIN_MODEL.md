# Workshop Domain Model

## Entity relationship model

```text
Ticket (1) ---- (0..1) Workshop Case
                         |
                         +---- (0..*) Technician Assignment
                         +---- (0..*) Technician Consultation
                         +---- (0..1) Job Card
                         |              +---- (0..*) Inspection
                         |              +---- (0..*) Diagnosis
                         |              +---- (0..*) Repair
                         |              +---- (0..*) Quality Check
                         |              +---- (0..1) Delivery Record
                         +---- (1..*) Workshop Timeline Event
```

The `0..1` Case relationship is the target v1 model: a Ticket may be resolved by the coordinator without workshop execution. Historical Cases are never deleted. A physical vehicle has at most one active Case at a time.

## Entities

### Workshop Case

**Purpose:** primary internal operational record from Ticket creation to resolution/closure. **Owner:** Workshop Module. **Relationship:** exactly one Ticket; optionally one Job Card; many assignments, consultations, and timeline events.

Key fields: case identifier, ticket identifier, `MotorNo.`, assigned hub, case status, decision, created/resolved/closed timestamps, active-assignment reference, audit version, and closure reason.

Rules: it is created after successful Ticket creation; it cannot change Ticket identity or physical vehicle; it owns all workshop activity; no second active Case is allowed for the same `MotorNo.`.

### Job Card

**Purpose:** repair execution record. **Owner:** Workshop Case. **Relationship:** exactly one parent Case; one active Job Card per Case in v1; owns inspection, diagnosis, repair, QC, and delivery records.

Key fields: job-card identifier, case identifier, status, responsible technician, work summary, planned/actual effort, parts recommendations/usage, stage timestamps, and completion evidence.

Rules: system-created only after `Workshop Repair Required`; cannot be detached from its Case; no new Job Card is created for a remote resolution.

### Technician Assignment

**Purpose:** records responsibility for case work. **Owner:** Workshop Case. **Lifecycle:** assigned, reassigned, ended. Key fields: technician, assigning actor, reason, effective timestamps, and scope.

Rules: assignment history is append-only; reassignment ends the prior assignment and records a reason; future multi-technician support uses multiple active assignment rows with an explicitly designated primary technician.

### Technician Consultation

**Purpose:** specialist/remote assistance without requiring a Job Card. **Owner:** Workshop Case. **Lifecycle:** requested, assigned, responded, accepted, resolved/cancelled.

Key fields: requesting technician, consultant, question, evidence references, recommendation, resolution, timestamps, and acceptance actor. A consultation can resolve the Ticket without repair; it cannot erase the original complaint or assignment history.

### Inspection

**Purpose:** factual assessment of the reported issue. **Owner:** Job Card. Key fields: inspector, findings, notes, attachments, completed timestamp, and outcome.

Rules: at least one completed inspection is required before diagnosis/repair; attachments are references owned by approved storage infrastructure; evidence is append-only.

### Diagnosis

**Purpose:** records fault, cause, recommended action, and parts recommendation. **Owner:** Job Card. Key fields: diagnostician, fault codes/categories, root-cause narrative, repair recommendation, parts recommendation, and decision timestamp.

Rules: diagnosis follows completed inspection; any approval policy is explicit and role-controlled—there is no implicit approval by a UI action.

### Repair

**Purpose:** records repair tasks performed. **Owner:** Job Card. Key fields: technician, task, labour record, parts usage, notes, start/end timestamps, and completion result.

Rules: multiple repairs are permitted; parts usage is immutable once recorded except for audited correction entries; future labour/parts integrations extend this entity rather than changing Case history.

### Quality Check

**Purpose:** confirms repair readiness. **Owner:** Job Card. Key fields: checker, checklist version/results, pass/fail outcome, evidence, timestamp, and rework reason.

Rules: only a passed required checklist permits Ready; a failed check creates a rework event and returns Job Card work to Repair without deleting QC evidence.

### Delivery Record

**Purpose:** records the Ready-to-Delivered operational hand-off. **Owner:** Job Card. Key fields: ready timestamp, assignment/delivery timestamp, recipient/confirmation reference when applicable, and exception reason.

Rules: Ready is technician-declared; Delivered is recorded from the approved vehicle assignment/delivery event. Customer confirmation is optional evidence unless a later business rule makes it mandatory.

### Workshop Timeline

**Purpose:** append-only, chronological audit projection. **Owner:** Workshop Case. Key fields: event type, entity reference, actor, server timestamp, prior/new state, remarks, metadata, and correlation identifier.

Rules: it records coordinator review, assignment, consultation, Case/Job Card creation, inspection, diagnosis, repair, QC, Ready, delivery, and closure. It is never edited or deleted; corrections create new events.
