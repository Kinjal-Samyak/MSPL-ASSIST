# Contributing to MSPL Assist

Thank you for contributing to MSPL Assist.

This repository follows an enterprise-quality workflow optimized for reliability, testability, and maintainability.

## Table of Contents

- [Development Workflow](#development-workflow)
- [Branch Naming](#branch-naming)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Review Process](#review-process)

## Development Workflow

1. create a branch from the default branch
2. make focused changes with a single objective per pull request
3. run local validation before pushing
4. open a pull request with implementation notes and test evidence
5. address review comments before merge

Recommended local validation:

```bash
cd backend
npm run build
npm run test:all
```

If using Docker:

```bash
docker compose up --build
```

## Branch Naming

Use descriptive prefixes:

- `feature/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `test/<short-description>`
- `chore/<short-description>`
- `hotfix/<short-description>`

Examples:

- `feature/ticket-tracking-flow`
- `fix/health-endpoint-contract`
- `docs/repository-readiness`

## Commit Message Convention

Use clear, imperative commit messages.

Preferred format:

```text
type(scope): summary
```

Examples:

- `feat(conversation): add confirmation handler`
- `fix(ticket): preserve context on creation failure`
- `docs(repo): rewrite public README`
- `test(services): add ticket service unit coverage`

Recommended commit types:

- `feat`
- `fix`
- `docs`
- `test`
- `refactor`
- `chore`
- `ci`

## Pull Request Process

Each pull request should include:

- concise problem statement
- summary of changes
- test evidence
- documentation impact
- screenshots or logs when relevant

PR checklist:

- [ ] changes are scoped to one objective
- [ ] build passes locally
- [ ] tests pass locally
- [ ] documentation updated if behavior or usage changed
- [ ] no unrelated refactoring included

## Coding Standards

Core standards:

- follow Clean Architecture boundaries
- keep business logic out of controllers
- place validation in validators
- keep services focused on business behavior
- keep repositories focused on persistence access
- use strong typing and existing DTOs/interfaces
- prefer reuse over duplication
- add comments only where they improve clarity

Do not:

- introduce magic strings when enums/constants already exist
- bypass services to call Prisma from handlers
- change business rules without explicit approval
- mix feature changes with unrelated cleanup

## Testing Requirements

Before requesting review:

- backend build must pass
- unit tests must pass
- integration tests must pass
- API tests must pass

Expected commands:

```bash
cd backend
npm run test:unit
npm run test:integration
npm run test:api
npm run test:coverage
```

Coverage guidance:

- target at least 80% statements/lines/functions in combined validation
- add tests for new validators, services, handlers, and API contracts

## Review Process

Reviews focus on:

- architectural compliance
- correctness
- business rule alignment
- test quality
- documentation completeness

For protected branches, maintainers should enforce:

- passing GitHub Actions workflow
- required review approval
- up-to-date branch before merge
- no direct pushes to the default branch

## Related Repository Documents

- [`README.md`](./README.md)
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)
- [`SECURITY.md`](./SECURITY.md)
- [`SUPPORT.md`](./SUPPORT.md)
- [`ROADMAP.md`](./ROADMAP.md)
