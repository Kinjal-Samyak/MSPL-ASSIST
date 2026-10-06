# Frontend Conversation Engine Implementation Guide

The Conversation Engine replaces only the Ticket Workspace Create New Ticket experience. Ticket list, ticket details, dashboard, reports, legacy ticket APIs, authentication, and authorization remain unchanged.

## Component hierarchy

`TicketWorkspacePage`

`-> CreateTicketWizardModal`

`-> RiderSearch | VehicleStep | RideabilityStep | IssueCategoryStep | IssueSubcategoryStep | IssueGroupsStep | RemarksStep | PhotoStep | ReviewStep | SuccessStep`

The modal consumes `useTicketConversation`, the Web Adapter. It delegates workflow transitions and validation to the React-independent `@mspl/conversation-workflow` workspace package. Existing services are used only at their relevant steps: Rider/vehicle lookup, master/lookup data, and `POST /api/v1/tickets/conversation`.

## Navigation and recovery

- Next is disabled when the pure step validator reports a required value is missing.
- Back preserves all captured values.
- Edit actions in Review return to the applicable section.
- Exit & Resume Later retains the in-memory draft for this Ticket Workspace session.
- Cancel explicitly discards the draft.
- Submission prevents concurrent requests through `SUBMITTING` status and leaves the draft intact on failure so the user can retry.

## Accessibility and responsiveness

- Progress announces the current step with `aria-current`.
- Step changes move focus to the step heading.
- Selectable Rider, vehicle, and rideability controls expose pressed state.
- Errors use alert or live-region semantics.
- Photo selection has an accessible label and responsive preview grid.

## Extension guidance

- Keep business validation in `conversation.validation.ts`, not individual UI controls.
- Add state fields through `TicketConversationState` and reducer actions in `useTicketConversation`.
- Keep channel-specific presentation out of the state model so WhatsApp or mobile adapters can map their own inputs to the same domain payload.
- Do not alter the legacy `POST /api/v1/tickets` contract. The Conversation Engine uses the additive conversation endpoint.

## Attachment constraint

The existing backend stores attachment references only. Do not add fake client-side upload progress or binary persistence assumptions. Add real per-file progress and retry only when an approved storage/upload API exists.
