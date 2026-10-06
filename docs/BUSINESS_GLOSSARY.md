# MSPL Assist — Business Glossary

## Status

**Frozen.** This is the single business-language reference for developers, testers, product owners, and future contributors. Use these terms in all new user-facing content, business rules, test cases, and documentation.

Legacy technical names are retained only where required to preserve an existing database or API contract. They do not define a separate business entity.

## Core terms

| Business term | Definition | Compatibility reference |
| --- | --- | --- |
| **Rider** | The person renting a vehicle from MSPL. A Rider was previously referred to internally as a Customer. There is no separate Customer business entity. | Prisma `Customer` model and legacy `Customer*` code names represent the Rider. |
| **Rider Phone Number** | The canonical business identifier for a Rider. It is the only key used to identify, find, update, or merge Rider records. | `Customer.registeredMobile` and legacy `customerId` payload relationships. |
| **Rider Name** | The Rider's display name. It may change and must never be used to identify or merge Rider records. | `Customer.name` / legacy `customerName`. |
| **MV Track No.** | The unique identifier of the currently deployed rental asset. It is the operational relationship key between master deployment and inventory source data. | `Deployment.mvTrackNumber`. |
| **Current Vehicle** | The vehicle currently associated with a Rider's current deployment, identified operationally by its Current MV Track No. | Deployment/inventory relationship. |
| **MotorNo.** | The physical vehicle identifier from inventory data. | Source `motorNumber`; currently persisted as `Deployment.vehicleNumber`. |
| **Physical Vehicle** | The physical vehicle represented by MotorNo., distinct from the rental-assignment identifier (MV Track No.). | Inventory row and `Deployment.vehicleNumber`. |
| **Deployment** | A Rider's rental assignment for a particular vehicle and rental-plan period. | `Deployment` model. |
| **Rental Plan** | A prepaid rental period defined by a Start Date and End Date. | Master Deployment workbook row. |
| **Current Completed Rental Plan** | The Rider rental-plan record with the latest valid End Date. Its Paid Status alone determines the Rider's account state. Records without a valid End Date are ignored when any valid End Date exists. | Rider status resolver. |
| **Current Rental Plan** | The Rider's latest valid Start Date record whose FDD Status is exactly `Plan Start`. It determines the current assignment only, including Current Plan Start Date, Current MV Track No., hub, model, and MotorNo.-derived vehicle. | Rider assignment resolver. |
| **Paid Status** | The payment/account outcome recorded on a Rental Plan. Exactly `Closed a/c` on the Current Completed Rental Plan means the account is closed; every other value means active. | Master Deployment workbook `Paid Status`. |
| **Rider Account Status** | The business status derived exclusively from the Current Completed Rental Plan's Paid Status: Closed for `Closed a/c`, otherwise Active. | Persisted as `Customer.status`: `INACTIVE` for Closed and `ACTIVE` otherwise. |
| **Deployment Status** | The persisted lifecycle state derived from Rider Account Status during synchronization. | `Deployment.rentalStatus`: `COMPLETED` for Closed and `ACTIVE` otherwise. |

## Identity rules

1. The same Rider Phone Number always represents the same Rider, even when the Rider Name changes.
2. The same Rider Name with different Rider Phone Numbers represents different Riders.
3. Rider Name must never be used as an identity, matching, merge, synchronization, notification, workshop, or service-ticket key.
4. All Rider-linked business operations use Rider Phone Number to locate the master Rider record.

## Current assignment rules

1. Group master deployment records by Rider Phone Number.
2. From each Rider's rows, consider only records with FDD Status `Plan Start` and a valid Start Date.
3. The latest Start Date is the Current Rental Plan. Exchange and Upgrade records are valid Plan Starts and therefore become current when latest.
4. Current Vehicle is resolved from Inventory through the Current MV Track No. relationship; MotorNo. remains the physical-vehicle value.
5. Account Status is independent: it is derived only from the latest valid End Date and its Paid Status. Never use the Current Rental Plan selection to derive account state.

## Compatibility rules

- Do not introduce a new Rider database table or migrate the existing `Customer` table for terminology alone.
- Do not change existing `/api/v1/customers` endpoints or legacy payload fields without a separately approved API versioning plan.
- New user-facing language and new business-domain code must use **Rider** terminology.
- When legacy code names are unavoidable, document them as compatibility references rather than business concepts.
