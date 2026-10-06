# Parts Import Architecture v1.0

The Parts Import Subsystem has one shared engine for catalogue and inventory templates. It owns workbook parsing, header/version validation, preview, row errors, confirmation orchestration, and import audit history. Catalogue and inventory persistence remain separate consumers of the same validated preview.

Stage 1 delivers the pure parser and versioned template generator. It performs no database update. Stage 2 adds catalogue preview/confirmation; Stage 3 adds inventory after hub inventory/reservations exist; Stage 4 adds shared history/audit; Stage 5 adds UI.

`POST` import endpoints must not persist until an explicit confirmation operation. Excel formulas and display totals are never authoritative.
