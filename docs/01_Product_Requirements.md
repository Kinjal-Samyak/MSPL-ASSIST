# MSPL Assist
# Product Requirements Document (PRD)

| Document | Product Requirements Document |
|----------|-------------------------------|
| Version | 1.0 |
| Status | Approved (Version 1 Frozen) |
| Owner | Product Team |
| Last Updated | July 2026 |

---

# 1. Executive Summary

MSPL Assist is a centralized Service Operations Platform designed to simplify the process of registering, tracking, and resolving service issues for rental vehicles.

The platform enables customers to raise service issues through WhatsApp while allowing coordinators to manage service tickets using Microsoft Excel Online. The backend serves as the central business engine, ensuring consistent workflows, validations, notifications, and reporting.

Version 1 focuses on delivering a production-ready Minimum Viable Product (MVP) that can support daily operations with minimal manual intervention.

---

# 2. Business Problem

Current service operations rely heavily on manual communication between customers and service coordinators.

Common challenges include:

- Customers contacting multiple coordinators.
- No centralized record of complaints.
- No standardized ticket lifecycle.
- Lack of ticket tracking.
- Manual customer follow-ups.
- No audit history.
- Difficulty measuring service performance.
- Limited operational reporting.

These inefficiencies result in delayed responses, inconsistent communication, and reduced customer satisfaction.

---

# 3. Product Vision

To build a scalable Service Operations Platform that becomes the single system of record for all customer service activities.

The platform should:

- Simplify customer interactions.
- Reduce coordinator workload.
- Standardize operational workflows.
- Improve customer communication.
- Provide complete operational visibility.
- Support future business expansion.

---

# 4. Product Objectives

The objectives of Version 1 are:

- Enable customers to register service issues using WhatsApp.
- Automatically generate service tickets.
- Allow customers to track existing tickets.
- Provide coordinators with an easy-to-use Excel workspace.
- Automate customer notifications.
- Maintain complete audit history.
- Generate reliable operational data.
- Reduce manual coordination.

---

# 5. Target Users

## 5.1 Customer

The customer should be able to:

- Register a service issue.
- Upload supporting photos.
- Track ticket status.
- Receive service updates.
- Resume an interrupted conversation.
- Receive ticket confirmation.

---

## 5.2 Service Coordinator

The coordinator should be able to:

- Review service tickets.
- Update ticket status.
- Update ETA.
- Update estimated charges.
- Update final charges.
- Add internal notes.
- Publish customer updates.

The coordinator should not manually compose customer messages.

---

## 5.3 Operations Manager

The operations manager should be able to:

- Monitor ticket volumes.
- Review service performance.
- Measure turnaround time.
- Monitor coordinator workload.
- Review operational trends.
- Access reporting data.

---

# 6. Product Scope (Version 1)

## Customer Features

- WhatsApp interaction
- Register service issue
- Track existing ticket
- Upload photos
- Receive ticket confirmation
- Receive status updates
- Resume conversation

---

## Coordinator Features

- Excel Online workspace
- Update ticket status
- Update ETA
- Update estimated charges
- Update final charges
- Internal notes
- Publish updates

---

## Backend Features

- Ticket Management
- Conversation Management
- Workflow Management
- Notification Management
- Audit Trail
- Database Master Data
- Automatic Ticket Number Generation

---

# 7. Business Benefits

Implementation of MSPL Assist should result in:

- Faster complaint registration.
- Standardized service process.
- Reduced manual communication.
- Better customer experience.
- Improved operational visibility.
- Reliable historical records.
- Better decision making through structured data.

---

# 8. Success Metrics

The MVP will be considered successful if:

| Metric | Target |
|---------|--------|
| Customer ticket registration | < 2 minutes |
| Coordinator ticket update | < 30 seconds |
| Ticket creation success | > 99% |
| Notification delivery | Logged for every publish |
| Manual database updates | Zero |
| Duplicate ticket numbers | Zero |

---

# 9. Functional Overview

## Customer Journey

Customer sends "Hi" on WhatsApp.

↓

Selects "Register Service Issue."

↓

Chooses issue category.

↓

Describes the issue.

↓

Uploads a photo (optional).

↓

Provides registered mobile number.

↓

System verifies customer and deployment.

↓

Service ticket is created.

↓

Customer receives ticket confirmation.

---

## Coordinator Journey

Coordinator opens Excel Online.

↓

Reviews tickets.

↓

Updates status.

↓

Updates ETA.

↓

Updates charges.

↓

Adds internal notes.

↓

Checks "Notify Customer."

↓

Clicks "📤 Publish Updates."

↓

Backend updates PostgreSQL.

↓

Professional WhatsApp message is generated automatically.

---

# 10. Product Principles

The product follows these principles:

- Customer effort should be minimized.
- Coordinator effort should be minimized.
- Software should automate repetitive tasks.
- Backend is the single source of truth.
- Business rules exist only once.
- Configuration is preferred over hardcoded values.
- Every action is traceable.
- Every notification is logged.
- Every workflow is recoverable.

---

# 11. Assumptions

Version 1 assumes:

- Customers have access to WhatsApp.
- Coordinators use Microsoft Excel Online.
- PostgreSQL is available.
- Internet connectivity exists.
- WhatsApp Business API is configured.

---

# 12. Constraints

Version 1 will not include:

- Customer web portal
- Technician application
- AI assistant
- Power BI dashboards
- Inventory management
- Warranty management
- Spare parts management
- Multi-language support
- Offline operation

These are planned for future releases.

---

# 13. Risks

Potential risks include:

- WhatsApp API downtime.
- Incorrect customer mobile numbers.
- Duplicate customer records.
- Delayed coordinator updates.
- Network interruptions.
- Integration failures.

These risks will be mitigated through validation, audit logging, retry mechanisms, and operational monitoring.

---

# 14. Future Roadmap

Future versions may include:

- Technician Mobile Application
- Customer Self-Service Portal
- AI-powered Assistant
- Power BI Dashboards
- SLA Management
- GPS Tracking
- Inventory Management
- Warranty Management
- Predictive Maintenance
- Multi-language Support
- Multi-company Support

---

# 15. Acceptance Criteria

Version 1 will be accepted when:

- Customers can successfully register service issues.
- Customers can track existing tickets.
- Coordinators can manage tickets through Excel Online.
- Customer notifications are generated automatically.
- Ticket lifecycle is fully traceable.
- Audit history is complete.
- Business data is stored centrally in PostgreSQL.

---

# 16. References

This document should be read together with:

- 00_System_Blueprint.md
- 04_Business_Rules.md
- 05_Functional_Specification.md
- 06_Database_Design.md
- 07_Technical_Architecture.md

---

# Approval

Status: APPROVED

This Product Requirements Document defines the business scope and objectives of MSPL Assist Version 1.

Any changes to product scope must be reviewed and recorded in `99_Decision_Log.md`.