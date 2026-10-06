# MSPL Assist - Field Mapping

## Purpose and authority

This is the implementation-oriented field map for the Operational Data Wizard and active Excel synchronization path. Administrators can override the displayed workbook header names; therefore the default names are not a fixed external contract.

## Terminology

The business terms in this map are Rider, Rider Phone Number, Rider Name, Current Vehicle (Current MV Track No.), and Physical Vehicle (MotorNo.). Legacy `Customer` table/field names are shown only where needed to identify the unchanged persistence contract.

## Master deployment workbook mapping

| Internal mapping key | Default header | Primary use |
| --- | --- | --- |
| `customerName` | Rider Name | Rider display name |
| `phone` | Rider Phone Number | Canonical rider identity and grouping key |
| `hub` | Hub | Fallback hub source |
| `vehicleNumber` | Vehicle Number | Source vehicle reference |
| `mvTrackNumber` | MV Track Number | Deployment identity and relationship key |
| `plan` | Plan | Source metadata; not persisted to core deployment |
| `rentalStatus` | Rental Status | Source status interpretation |
| `deploymentDate` | Start Date | Latest valid `Plan Start` record determines Current Plan Start Date |
| `returnDate` | Return Date | Source metadata; not persisted to core deployment |
| `coordinator` | Coordinator | Source metadata; not persisted to core deployment |

## Inventory workbook mapping

| Internal mapping key | Default header | Primary use |
| --- | --- | --- |
| `mvTrackNumber` | MV Track Number | Inventory identity and relationship key |
| `vehicleNumber` | Vehicle Number | Source vehicle reference |
| `model` | Model | Vehicle model display name |
| `modelCode` | Model Code | Vehicle model identity |
| `status` | Status | Inventory source status |
| `hub` | Hub | Hub source |
| `battery` | Battery | Source metadata |
| `iotDevice` | IOT Device | Source metadata |
| `vin` | VIN | Source metadata |
| `motorNumber` | Motor Number | Used as vehicle-number value in current rider assignment persistence |
| `chassisNumber` | Chassis Number | Source metadata |

## Relationship mapping

```text
Master Deployment.MV Track Number <-> Inventory.MV Track Number
```

The wizard can instead use manually selected relationship columns. Candidate confidence is calculated from normalized header equality, containment and token similarity.

Relationship values are normalized by trimming, uppercasing, removing non-alphanumeric characters, and normalizing relevant numeric zero padding. This reduces failures caused by formatting variation, but it can create collisions if source keys are not governed.

## Joined source to core database mapping

| Joined operational value | Source rule | Database destination |
| --- | --- | --- |
| Rider name | Latest selected master row | `Customer.name` |
| Registered mobile | Normalized master phone | `Customer.registeredMobile`, `Customer.whatsAppNumber` |
| Rider status | Latest valid End Date row only; `Closed a/c` makes it inactive | `Customer.status` |
| Hub | Inventory hub, falling back to master hub | `Hub.name`, `Deployment.hubId` |
| Model code | Inventory model code | `VehicleModel.modelCode`, `Deployment.vehicleModelId` |
| Model name | Inventory model, else model code | `VehicleModel.displayName` |
| MV Track number | Current master assignment | `Deployment.mvTrackNumber` |
| Vehicle number | Current implementation uses inventory motor number | `Deployment.vehicleNumber` |
| Account/rental status | Latest End Date master row only: Paid Status exactly `Closed a/c` -> CLOSED/COMPLETED; otherwise ACTIVE/ACTIVE | `Customer.status`, `Deployment.rentalStatus` |
| Current assignment | Latest valid FDD Status `Plan Start` row; Master MotorNo. must join Inventory MotorNo. | Inventory Current MV Track No., hub, model, MotorNo.-derived vehicle, and deployment start timestamp |
| Current Rider Snapshot | One projection per Rider Phone Number after synchronization | Persisted `AppSetting` JSON record in category `CURRENT_RIDER_SNAPSHOT` |

## Validation and persistence rules

- A workbook must be retrievable and contain the selected worksheet.
- A worksheet must contain a non-empty requested or detected header row.
- Master mobile values are normalized to digits and must be 10-15 digits to persist a customer.
- Joined deployment persistence rejects a missing model code, hub, MV Track number or vehicle number.
- Duplicate master/inventory source rows are excluded from their respective sync paths.
- Rider persistence (`Customer`) is upserted by Rider Phone Number, `Hub` by name, `VehicleModel` by model code, and deployment lookup is performed by Current MV Track No.

## Information that is currently not materialized

The core Customer/Deployment schema does not retain every workbook field. Examples include plan, coordinator, return date, battery, IOT device, VIN, chassis number and raw inventory status. These values may be available in staged/synchronized records but not in the central operational entities.

## Mapping risks and decisions needed

1. Confirm whether inventory motor number is intentionally the canonical deployment vehicle number.
2. Define duplicate-key handling after normalization, including which source row wins and how it is reported.
3. Define whether deleted/missing source rows should deactivate, complete, delete, or leave current PostgreSQL records unchanged.
4. Define the long-term schema for metadata that is imported but not materialized today.
