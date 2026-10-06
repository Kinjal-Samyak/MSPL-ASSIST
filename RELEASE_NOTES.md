# Release Notes

## Version 1.0.0

Release date: 2026-07-09

## Release Overview

MSPL Assist 1.0.0 establishes the production-ready backend foundation for WhatsApp-led service request intake, conversation orchestration, and ticket creation. This release also includes repository-quality testing, Dockerized local development, and CI validation.

## Highlights

- Production-oriented backend architecture
- Complete conversation-driven service request creation flow
- Master data APIs and ticket creation API
- Automated testing and coverage reporting
- Docker-first local setup
- GitHub Actions build validation pipeline

## Architecture

This release ships with:

- Clean Architecture separation between controllers, services, repositories, validators, and handlers
- State Pattern implementation for conversation flow
- Factory-based state handler resolution
- Prisma-backed PostgreSQL persistence
- audit trail support through ticket history and ticket activity creation

## New Features

- Customer conversation workflow for service intake
- Verified deployment lookup integration
- Ticket creation orchestration via `TicketService`
- Health endpoint and foundational API surface
- Docker Compose local environment with PostgreSQL and pgAdmin
- unit, integration, and API test suites

## Performance

- deterministic test execution with isolated mocked workflows
- dependency caching in CI
- Docker-based onboarding that reduces local environment drift
- structured backend startup path for migrations, seeding, and development reload

## Testing Summary

Latest verified results:

- **Unit tests:** passing
- **Integration tests:** passing
- **API tests:** passing
- **Combined suites:** 93 passing tests

Latest combined coverage:

- Statements: **84.53%**
- Lines: **84.44%**
- Functions: **98.19%**
- Branches: **59.29%**

## Known Limitations

- Ticket tracking flow is not yet implemented
- Notification engine is planned but not active
- Frontend is currently a starter application, not a complete operations portal
- Authentication, authorization, and public production deployment controls are roadmap items

## Upgrade Notes

This is the initial public-ready release candidate documentation set for Version 1.0.0.

Recommended post-clone steps:

1. review [`README.md`](./README.md)
2. start local services with `docker compose up`
3. verify the backend through `GET /health`
4. review [`ROADMAP.md`](./ROADMAP.md) and [`CHANGELOG.md`](./CHANGELOG.md) before planning follow-on work
