# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | Yes |
| < 1.0 | No |

## Reporting Vulnerabilities

Please do **not** report security vulnerabilities through public issues.

Preferred reporting path:

1. use GitHub Security Advisories / private vulnerability reporting if enabled
2. otherwise contact the repository maintainers through the private support path documented in [`SUPPORT.md`](./SUPPORT.md)

## Security Contact

Security contact for this repository:

- **Repository maintainers via private security disclosure channel**

If repository security advisories are not yet enabled, open a private maintainer contact request through the support process and clearly mark the request as a **security report**.

## Responsible Disclosure

When reporting a vulnerability, please include:

- affected component
- severity estimate
- reproduction steps
- proof of concept, if safe to share
- potential impact
- suggested mitigation, if available

Please allow maintainers reasonable time to validate and remediate the issue before public disclosure.

## Secrets Handling

- never commit secrets, access tokens, or production credentials
- use environment variables for all sensitive configuration
- rotate compromised secrets immediately
- remove leaked credentials from Git history where applicable
- avoid printing secrets in logs, screenshots, or CI output

## Environment Variables

Sensitive configuration is environment-driven.

Examples:

- `DATABASE_URL`
- `POSTGRES_PASSWORD`
- `PGADMIN_DEFAULT_PASSWORD`

Guidance:

- keep local values in untracked `.env` files
- use GitHub repository or organization secrets for CI/CD
- avoid hardcoding credentials in source or workflow files

## Authentication Roadmap

Authentication and authorization are planned post-Version 1 and should be treated as roadmap work, not currently shipped behavior.

Planned areas:

- role-based access control
- coordinator/admin authentication
- secret rotation policy
- stronger production environment separation
- security-focused operational monitoring

## Related Documents

- [`README.md`](./README.md)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`SUPPORT.md`](./SUPPORT.md)
- [`docs/13_Test_Strategy.md`](./docs/13_Test_Strategy.md)
