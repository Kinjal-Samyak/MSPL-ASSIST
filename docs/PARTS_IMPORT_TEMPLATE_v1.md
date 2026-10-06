# Parts Import Templates v1.0

Template version is `1.0`. Each workbook has an `Inventory` sheet and a `Read Me` sheet. Header names and template version are mandatory.

## Catalogue

`Part Code, Part Name, Description, Part Category, Part Subcategory, Model Code, Model Name, Unit, Part Cost, Warranty Eligible, Consumable, Minimum Stock, Reorder Level, Maximum Stock, Active, Remarks, Template Version`

Catalogue imports never change stock.

## Inventory

`Hub, Part Code, Quantity, Invoice Number, Invoice Date, Import Mode, Remarks, Template Version`

Inventory imports never create Parts or modify catalogue data. Supported modes are `INITIAL_IMPORT`, `ADD_STOCK`, and `REPLACE_STOCK`.
