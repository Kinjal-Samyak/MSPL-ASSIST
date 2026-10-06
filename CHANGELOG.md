# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows Semantic Versioning principles for documented releases.

## [Unreleased]

### Added

- Conversation Engine web journey: rider lookup by registered mobile number or name, duplicate-name selection, active vehicle confirmation, rideability, Admin-managed issue groups, remarks, photo references, review, submission, and success handling.
- Additive `POST /api/v1/tickets/conversation` frontend client integration.
- Development validation coverage for the Conversation Ticket workflow, including persistence, retrieval, list visibility, and repeatable cleanup.

### Changed

- Ticket workspace refreshes after a confirmed Conversation Ticket creation and opens the created ticket when available.

### Release plan

The intended release sequence is maintained in [`docs/VERSIONING.md`](docs/VERSIONING.md). Planned version labels are not release records until their validation and release notes are approved.

## [1.0.0] - 2026-07-09

### Added

- Clean Architecture backend foundation using Express, TypeScript, Prisma, and PostgreSQL
- Master data APIs for statuses, issue categories, hubs, and vehicle models
- Ticket creation API with ticket number generation and audit trail creation
- Conversation Engine with state-driven handler orchestration
- Validator consistency refactor for conversation input handling
- Unit, integration, and API testing foundations
- Docker-based local development workflow with PostgreSQL and pgAdmin
- GitHub Actions build validation pipeline
- Production documentation set for repository readiness

### Changed

- Repository documentation rewritten for public release readiness
- Local development workflow standardized around `docker compose up`
- Test execution standardized into unit, integration, API, and combined coverage flows

### Fixed

- Validator responsibilities centralized into dedicated validator modules
- Documentation gaps identified during architecture audit were addressed
- Repository onboarding clarity improved for new contributors and maintainers

### Known Limitations

- WhatsApp Cloud API integration is not yet implemented
- Notification engine is documented but not yet operational
- Ticket tracking conversation flow remains a future milestone
- Authentication and authorization are not part of Version 1
- Frontend remains a starter shell and not a full operational portal

### Future Improvements

- Ticket tracking workflow
- Notification publishing pipeline
- Coordinator-facing APIs
- Admin and analytics user interfaces
- Security hardening and post-release operational enhancements
