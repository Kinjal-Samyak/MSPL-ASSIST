# Parts Business Rules v1.0

> Status: Frozen. This is the business reference for the Parts Module.

1. Parts is the single source of truth for Parts Master, hub inventory, reservations, inventory transactions, imports, and parts reporting. Workshop consumes Parts; it never manages inventory.
2. Parts Master stores master data only. It never stores current, reserved, or available quantities.
3. Each Part has one configurable **Part Cost**. There is no Purchase Cost or Selling Price field.
4. Charging Policy belongs to a Job Card usage, never to Parts Master: `WARRANTY`, `CONSUMABLE`, or `CHARGEABLE`.
5. Warranty and Consumable have customer payable value of ₹0. Chargeable is `Part Cost Snapshot × Issued Quantity`. Technicians never enter prices.
6. A Part Cost Snapshot is copied when a Part is selected for a Job Card. Later Parts Master price changes never alter historical usage.
7. Inventory is hub-wise. `PartInventory` is the current snapshot only: current quantity, reserved quantity, and available quantity. It contains no movement history.
8. `InventoryTransaction` is append-only history. Inventory must never change without an associated transaction.
9. Inventory lifecycle is mandatory: select → reserve → issue → transaction → stock deduction. Reservation does not deduct stock; issue does.
10. `PartReservation` is the future Stage 2 operational record: job-card reference, part, hub, reserved/issued quantities, status, actor, timestamps, and release details.
11. Imports use the official template and validate required columns, duplicate Part Codes, categories, vehicle models, positive quantities, non-negative costs, and boolean fields. Invalid files are not imported.
12. Import history stores file hash, import/template version, source, imported hub, optional comments, mode, row outcomes, duration, and status.
