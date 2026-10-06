# ADR-002: Conversation Workflow Engine

## Decision

`packages/conversation-workflow/src/index.ts` is the pure source of truth for ordered steps, Next, Back, Edit, validation gates, and completion guards. Frontend and backend consume the same workspace package, `@mspl/conversation-workflow`.

## Diagram

`Web adapter -> workflow action -> pure transition -> workflow state -> Web rendering`

## Consequence

Invalid forward transitions remain at the current step and return an explicit validation message.
