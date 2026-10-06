# MSPL Assist — Coordinator Workspace Design Specification (Frozen)

Version 1.0

## Project context

MSPL Assist is an enterprise-grade Service Management Platform designed to simplify service operations for non-technical users. The Coordinator Workspace is the primary operational interface used by service coordinators throughout the day. It enables coordinators to complete most daily responsibilities from one intuitive workspace.

This document is the source of truth for all future Coordinator Workspace development.

## Coordinator First Design Principle

Every feature added to the Coordinator Workspace must reduce effort, clicks, or decision-making for the coordinator. A feature that increases complexity without meaningful operational value must be simplified, deferred, or rejected. The workspace must guide work rather than expecting coordinators to search for it. This principle takes precedence over adding functionality.

## Design objectives

The Coordinator Workspace must:

- Be simple enough for non-technical users.
- Minimize typing through dropdowns, buttons, and predefined values.
- Reduce repetitive work through automation.
- Keep operational tasks in one workspace and reduce navigation.
- Surface priority work automatically.
- Support Business-As-Usual operations with minimal training.
- Remain modular for future enhancement without redesign.

## Standard workspace layout

The MVP Coordinator Workspace permanently consists of these modules.

### 1. Today's Summary

Provides an instant overview on login. It displays New Tickets, In Progress, Waiting for Parts, High Priority, Closed Today, and Callback Requests.

### 2. Action Center

Guides coordinators to the highest-priority work. It displays clickable work queues such as High Priority Tickets, ETA Overdue, Waiting for Parts, Customers Awaiting Callback, and Ready to Close. Selecting an item opens its filtered work queue. Coordinators should never need to manually search for urgent work.

### 3. Ticket Workbench

The primary operational workspace, providing ticket viewing, search, quick and advanced filters, a ticket-details drawer, status updates, workshop assignment, ETA management, internal remarks, timeline, ticket closure, and bulk actions.

Quick filters are All Tickets, New, In Progress, Waiting for Parts, High Priority, Closed Today, and My Workshop.

**Business rule:** a ticket remaining open for more than 72 hours is automatically High Priority.

### 4. Customer Assistance Queue

Manages riders requesting coordinator assistance. These requests are not service tickets. A callback request becomes a service ticket only after coordinator review determines one is needed.

The WhatsApp journey is Raise Service Ticket, Check Ticket Status, or Request Coordinator Callback. A rider selects a callback reason, may enter remarks, and submits the request. No service ticket is created at this stage.

The queue displays customer name, vehicle, mobile number, hub, reason, request time, and status. Actions are Call Customer, Create Service Ticket, Mark Resolved, and Close Request.

When creating a ticket from a callback request, the system opens ticket creation with customer, vehicle, and callback details pre-populated, permits completion of remaining required information, creates the ticket, and links it to the callback request. Traceability between callback and ticket is mandatory.

### 5. Notifications

Provides visibility of pending, failed, and successfully sent notifications, using the existing Notification Engine.

### 6. Import History

Provides quick access to Excel imports, validation errors, failed imports, and import logs.

### 7. Reports

Provides operational reports including open tickets, closed tickets, high-priority tickets, workshop performance, ticket aging, and daily activity. Reports support Excel and CSV export.

## General design principles

- One workspace for daily operations.
- Maximum information with minimum complexity.
- Fewer clicks and more automation.
- Clear visual indicators for priority work.
- Dropdowns over free-text input where practical.
- Consistent, responsive, fast, and keyboard-accessible modules.

## Frozen business rules

- Customer callback requests are not service tickets.
- A callback request may result in a service ticket only after coordinator review.
- Every ticket created from a callback request must reference its original callback request.
- High Priority is automatically assigned after an open duration of more than 72 hours.
- Every significant action must be recorded in activity history.
- Bulk actions must create audit records for each affected ticket.
- The Action Center always reflects current operational state.

## Out of scope for the MVP

Live chat, AI ticket categorization, technician mobile application, SLA analytics, customer feedback surveys, predictive maintenance, inventory management, and advanced workflow automation are intentionally excluded.

## Definition of success

A coordinator can log in and understand priorities immediately; access operational work from one workspace; manage service tickets; respond to callback requests; create linked service tickets when required; use bulk actions; generate reports; and complete most daily work without navigating across multiple screens.

## Codex implementation instructions

When implementing or modifying the Coordinator Workspace:

- Treat this document as the governing design specification.
- Preserve the Coordinator First Design Principle.
- Reuse existing business logic, APIs, services, authentication, authorization, and UI components wherever possible.
- Build modular additive components; do not refactor stable modules.
- Prioritize usability, maintainability, and backward compatibility.
- Avoid unnecessary complexity or user interactions.
- Verify existing functionality is unchanged, TypeScript and ESLint are clean, and there are no regressions before completion.

## Product decision (Frozen)

The MVP Coordinator Workspace architecture is frozen as: Today's Summary, Action Center, Ticket Workbench, Customer Assistance Queue, Notifications, Import History, and Reports. Future enhancements must align with the Coordinator First Design Principle and simplify, rather than complicate, the coordinator's daily work.
