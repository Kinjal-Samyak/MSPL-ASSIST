# Parts Module Architecture v1.0

## Module boundary

`/api/v1/parts` is a standalone module. It owns catalogue, hub inventory, reservations, immutable transactions, controlled imports, and Parts reporting. Existing Ticket and Workshop APIs are unchanged.

```text
Workshop Job Card (future consumer)
  -> IPartsWorkshopFacade
     -> IPartsCatalogService / IPartsInventoryService / IPartsReservationService
        -> Parts Module persistence
```

## Delivery stages

1. **Catalogue (current):** Part categories, subcategories, Part Master, compatibility, Part Cost, catalogue API/UI.
2. **Inventory:** `PartInventory`, `PartReservation`, reserve/release/issue workflow, append-only `InventoryTransaction`.
3. **Imports:** template, validation, preview/confirm, version/hash/source/hub audit, and import history.
4. **Reports:** inventory, consumption, financial, and import-report projections.
5. **Workshop port:** implement the facade against Parts services without modifying Workshop ownership or endpoints.

## Stage 1 schema

`PartCategory`, `PartSubcategory`, `Part`, and `PartVehicleCompatibility` are additive Parts-only tables. Compatibility uses model code/name snapshots and does not alter the existing Vehicle Model table. No existing table or API contract is changed.
