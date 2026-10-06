# Workflow Framework

`WorkflowRepository` (`src/repositories/workflow/`) is the single abstraction for job-card
workflow actions:

```ts
interface WorkflowRepository {
  getAvailableActions(jobId: string): Promise<WorkflowAction[]>;
  executeAction(jobId: string, actionId: string): Promise<WorkflowExecutionResult>;
}
```

`JobWorkspaceFacade.loadWorkspace` calls `getAvailableActions` and hands the result straight to
the screen; `WorkflowActionsPanel` renders whatever list comes back and never invents an action of
its own. `JobWorkspaceFacade.executeAction` calls `executeAction` with an action id the backend
already offered — never one computed or validated client-side — and on success invalidates
`['jobWorkspace', jobId]`, `['dashboard']`, `['jobs']`.

## Why the mock data looks the way it does

`MockWorkflowRepository` returns exactly one fixed action, `{ id: 'acknowledge', label:
'Acknowledge Job' }`, for every job regardless of state. This is deliberate, not incomplete: real
MSPL job-card transition names (Start Repair, Mark Complete, Return to Workshop, ...) and their
validity per state are backend business rules. Encoding them into mock data — even just for
UI preview — would mean this mobile layer presuming which actions are valid for which job state,
which is exactly the responsibility the Repository Pattern is designed to keep server-side. See
[REPOSITORY_PATTERN.md](./REPOSITORY_PATTERN.md).

## Backend contract (expected shape, not implemented)

```
GET  /api/v1/mobile/job-cards/:jobCardId/workflow/actions
POST /api/v1/mobile/job-cards/:jobCardId/workflow/actions/:actionId/execute
```

`WorkflowAction` and `WorkflowExecutionResult` (`src/models/`) are the DTOs a real
`ApiWorkflowRepository` would map onto — no shape change anticipated, since both were originally
modelled after the backend's real job-card workflow concepts.
