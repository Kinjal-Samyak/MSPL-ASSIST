# MSPL Assist terminology

## Frozen business language

| Business concept | Approved term | Implementation compatibility term |
| --- | --- | --- |
| Person renting a vehicle | Rider | `Customer` |
| Canonical business identifier | Rider Phone Number | `Customer.registeredMobile` |
| Display attribute | Rider Name | `Customer.name` / legacy `customerName` payload field |
| Current vehicle reference | Current MV Track No. | `Deployment.mvTrackNumber` |
| Physical vehicle reference | MotorNo. | Inventory `motorNumber`, currently persisted as `Deployment.vehicleNumber` |

Rider Phone Number is the only key for identifying or merging riders. Matching Rider Names do not establish identity. The same phone updates the same rider even when the display name changes; the same name with different phones represents different riders.

## Backward compatibility

No database or API redesign is implied by this terminology decision. The Prisma `Customer` model, `Customer*` payload fields/types, source-workbook internal mapping keys, existing `/api/v1/customers` endpoints, and legacy module filenames remain in place to prevent contract breakage. New backend business code can use the `RiderService`, `RiderModuleService`, and `RiderSearchService` aliases.
