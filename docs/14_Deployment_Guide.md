# MSPL Assist
# Deployment Guide

| Document | Deployment Guide |
|----------|------------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Engineering Team |
| Last Updated | July 2026 |

---

# 1. Purpose

This document describes the deployment process for MSPL Assist Version 1.

It defines the environments, deployment sequence, infrastructure requirements, configuration, monitoring, and rollback procedures.

---

# 2. Deployment Objectives

The deployment process must:

- Be repeatable.
- Minimize downtime.
- Protect production data.
- Support rollback.
- Ensure configuration consistency.
- Verify application health after deployment.

---

# 3. System Components

Version 1 consists of the following components:

- React Frontend
- Node.js Backend
- PostgreSQL Database
- Prisma ORM
- WhatsApp Business API
- Microsoft Graph API
- Excel Online Workspace

---

# 4. Environments

## Development

Purpose

Local development and testing.

Characteristics

- Local PostgreSQL
- Local Backend
- Local Frontend
- Test WhatsApp configuration

---

## Staging

Purpose

Pre-production testing.

Characteristics

- Mirrors Production
- Test Database
- Test WhatsApp
- User Acceptance Testing

---

## Production

Purpose

Live customer environment.

Characteristics

- Production PostgreSQL
- Production Backend
- Production Frontend
- Production WhatsApp Business API

---

# 5. Infrastructure

Backend

- Node.js
- Express
- TypeScript

Frontend

- React
- Vite

Database

- PostgreSQL

ORM

- Prisma

Source Control

- GitHub

Hosting

- Cloud-hosted Virtual Machine or Container Platform

---

# 6. Environment Variables

The following environment variables must be configured.

## Database

DATABASE_URL

---

## Application

PORT

NODE_ENV

APP_NAME

---

## WhatsApp

WHATSAPP_API_URL

WHATSAPP_ACCESS_TOKEN

WHATSAPP_PHONE_NUMBER_ID

---

## Microsoft Graph

GRAPH_CLIENT_ID

GRAPH_CLIENT_SECRET

GRAPH_TENANT_ID

GRAPH_EXCEL_WORKBOOK_ID

---

# 7. Deployment Sequence

Deployment must follow this order.

Step 1

Database migration

↓

Step 2

Backend deployment

↓

Step 3

Frontend deployment

↓

Step 4

Environment verification

↓

Step 5

Health Check

↓

Step 6

Smoke Testing

---

# 8. Database Deployment

Before deployment

- Backup Production Database.
- Verify migration scripts.
- Review schema changes.

Deployment

- Execute Prisma migrations.
- Verify migration success.

After deployment

- Validate tables.
- Validate indexes.
- Validate constraints.

---

# 9. Backend Deployment

Steps

- Install dependencies.
- Build application.
- Configure environment variables.
- Start backend service.
- Verify application logs.
- Execute Health API.

Health Endpoint

GET

```
/health
```

Expected Response

```json
{
  "status": "ok"
}
```

---

# 10. Frontend Deployment

Steps

- Install dependencies.
- Build React application.
- Publish static assets.
- Verify frontend loads successfully.

---

# 11. Excel Integration

Verify

- Excel workbook is accessible.
- Publish Updates API is reachable.
- Microsoft Graph authentication succeeds.

---

# 12. WhatsApp Integration

Verify

- API credentials.
- Outbound messaging.
- Notification logging.

Send a test notification before go-live.

---

# 13. Smoke Test Checklist

Verify

- Application starts.
- Health endpoint returns OK.
- Ticket creation works.
- Existing ticket lookup works.
- Ticket update works.
- Publish Updates works.
- Notification is delivered.
- Audit records are created.

---

# 14. Monitoring

Monitor

- Backend availability.
- Database connectivity.
- API response times.
- Notification failures.
- Error logs.
- Publish success rate.

---

# 15. Backup Strategy

Database

- Daily automated backup.
- Retain backups according to organizational policy.

Application

- Source code maintained in GitHub.
- Environment variables securely stored.
- Deployment artifacts versioned.

---

# 16. Rollback Strategy

Rollback is required if:

- Critical production issue.
- Database migration failure.
- Application instability.

Rollback Steps

1. Stop application.
2. Restore previous application version.
3. Restore database backup if required.
4. Verify application health.
5. Notify stakeholders.

---

# 17. Security

Ensure

- HTTPS enabled.
- Environment variables secured.
- Database credentials protected.
- API tokens encrypted.
- Least privilege access.

---

# 18. Go-Live Checklist

Before Production

✓ Database backup completed.

✓ Environment variables configured.

✓ Backend deployed.

✓ Frontend deployed.

✓ Database migration successful.

✓ Health endpoint verified.

✓ WhatsApp verified.

✓ Excel verified.

✓ Smoke testing completed.

✓ User Acceptance Testing approved.

---

# 19. Post Deployment

Within 24 hours of deployment

Verify

- Ticket creation.
- Ticket updates.
- Notifications.
- Conversation flow.
- Excel synchronization.
- Error logs.
- Performance metrics.

---

# 20. References

- 06_Database_Design.md
- 07_Technical_Architecture.md
- 08_API_Specification.md
- 10_Workflow_Engine.md
- 13_Test_Strategy.md

---

# Approval

Status: APPROVED

This document defines the deployment procedure for MSPL Assist Version 1.

All production deployments shall follow this guide.