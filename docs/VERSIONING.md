# MSPL Assist Versioning Practice

MSPL Assist uses Semantic Versioning for planned and released product milestones. A release is recorded only after its build, validation, release notes, and deployment decision are complete.

## Working rules

- Record every completed milestone under **Unreleased** in the root [CHANGELOG.md](../CHANGELOG.md).
- Move entries into a numbered release only when that release is approved.
- Use `MAJOR.MINOR.PATCH`: major for incompatible product or API changes, minor for backward-compatible capabilities, and patch for backward-compatible fixes.
- Do not change application package versions or the root `VERSION` marker merely because a feature is implemented; that occurs as part of a release decision.

## Planned product sequence

| Version | Milestone |
| --- | --- |
| v0.1.0 | Initial Ticket System |
| v0.2.0 | Development Test Platform |
| v0.3.0 | Conversation Engine Backend |
| v0.4.0 | Conversation Engine Frontend |
| v0.5.0 | WhatsApp Integration |
| v0.6.0 | Notification Engine |
| v0.7.0 | Technician Workflow |
| v0.8.0 | Customer Portal |
| v1.0.0 | Pilot Release |

## Current milestone position

The Conversation Engine frontend is functionally implemented through Milestone 2.6 and is recorded under **Unreleased**. It includes the web conversation journey and additive conversation-ticket submission contract. Formal assignment of the v0.4.0 release label should occur only after UAT and release approval.

## Existing release records

Historical release material remains in the root `VERSION`, [RELEASE_NOTES.md](../RELEASE_NOTES.md), and [CHANGELOG.md](../CHANGELOG.md). This practice does not rewrite those records; it establishes a consistent forward-looking milestone and release process.
