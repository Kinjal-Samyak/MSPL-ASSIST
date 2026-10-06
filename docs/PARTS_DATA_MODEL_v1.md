# Parts Data Model v1.0

> **Stage 1 frozen reference.** Catalogue entities are implemented. Inventory, reservation, and transaction entities are intentionally documented as Stage 2 only and do not yet exist in the database.

## Entity relationship diagram

```text
PartCategory
  PK id (UUID)
  UQ name
      │ 1
      ├───────────────< PartSubcategory
      │                  PK id (UUID)
      │                  FK categoryId → PartCategory.id
      │                  UQ (categoryId, name)
      │
      └───────────────< Part
                           PK id (UUID)
                           UQ partCode
                           FK categoryId → PartCategory.id
                           FK subcategoryId → PartSubcategory.id (optional)
                              │ 1
                              ├──────────────< PartVehicleCompatibility
                              │                 PK id (UUID)
                              │                 FK partId → Part.id
                              │                 UQ (partId, modelCode)
                              │
                              └──────────────< PartInventory [Stage 2]
                                                   UQ (partId, hubId)
                                                        │
                                                        ├──< PartReservation [Stage 2]
                                                        │       Job Card reference
                                                        │
                                                        └──< InventoryTransaction [Stage 2]
```

## Implemented tables

### `PartCategory`

- Primary key: `id` UUID.
- Unique constraint: `name`.
- Fields: name, description, displayOrder, active, timestamps.
- Relationships: one-to-many with `PartSubcategory` and `Part`.
- Indexes: active.
- Cascade rule: none. A category cannot be deleted while it is referenced; future deactivation preserves history.

### `PartSubcategory`

- Primary key: `id` UUID.
- Foreign key: `categoryId → PartCategory.id`, `ON DELETE RESTRICT`.
- Unique constraint: `(categoryId, name)`.
- Relationships: one-to-many with `Part`.
- Index: `(categoryId, active)`.
- Cascade rule: category deletion is restricted; subcategory removal from a Part sets that Part’s optional `subcategoryId` to null.

### `Part`

- Primary key: `id` UUID.
- Unique constraint: `partCode`.
- Foreign keys: `categoryId → PartCategory.id` (`RESTRICT`); optional `subcategoryId → PartSubcategory.id` (`SET NULL`).
- Master-only fields: identity, manufacturer/OEM/internal references, unit, Part Cost, warranty/consumable flags, stock thresholds, active state, and remarks.
- Relationships: one-to-many with compatibility rows; future one-to-many with inventory/reservations/transactions.
- Indexes: `(categoryId, active)`, `subcategoryId`, `partName`.
- Stock quantities are deliberately absent.

### `PartVehicleCompatibility`

- Primary key: `id` UUID.
- Foreign key: `partId → Part.id`, `ON DELETE CASCADE`.
- Unique constraint: `(partId, modelCode)`.
- Index: `modelCode`.
- Stores model-code/model-name compatibility snapshots. It does not alter the existing Vehicle Model table.

## Stage 2 planned tables

### `PartInventory`

Current-state snapshot only: Part reference, Hub reference, current quantity, reserved quantity, available quantity, row version, timestamps. It will have one row per `(partId, hubId)` and contain no inventory history.

### `PartReservation`

Operational reservation record: reservation ID, Job Card reference, Part, Hub, reserved/issued quantity, status, Part Cost Snapshot, charging policy, reserving actor, timestamps, release reason. Reservation prevents availability over-allocation but never deducts current stock.

### `InventoryTransaction`

Immutable accounting history: transaction ID, Part, Hub, quantity, movement type, reference type/ID, reservation reference where applicable, actor, server timestamp, remarks, and Part Cost Snapshot. A transaction is appended when stock is issued/deducted; historical rows are never updated or deleted.

## Stage 2 lifecycle integrity

```text
PartInventory available quantity
  -> PartReservation (reserve: reserved increases)
  -> Issue workflow (issue: current/reserved decrease)
  -> InventoryTransaction appended
```

Stock cannot be changed directly. The transaction and snapshot update must be one database transaction with optimistic/concurrency protection on the affected `PartInventory` row.
