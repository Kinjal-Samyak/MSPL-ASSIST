# Conversation Engine — No-Risk Mode

The frozen Conversation Engine v1.0 is being built first as a **shadow module**. It is deliberately not registered with routes, the existing WhatsApp adapter, the ticket service, notifications, database persistence, or background jobs.

The initial module is a pure state machine covering the rider journey's ordered steps and mandatory-field guards. It provides no runtime behaviour and cannot affect current customer conversations or ticket creation.

Before any integration, a separate approval is required for: persisted sessions/history, media storage, master-data adapters, review rendering, Ticket Service adapter, a feature flag, end-to-end testing, and controlled rollout.
