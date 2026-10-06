-- NimboB2B — Backfill clients + master order groups for legacy orders
-- Run AFTER `dotnet ef database update` for the ClientsMasterOrdersEtd migration.
-- Idempotent: safe to run multiple times.
--
-- 1) Create one Client per distinct client_name among orders that have no client.
-- 2) Create one MasterOrderGroup per client.
-- 3) Link the orders to their client + group.

WITH inserted AS (
    INSERT INTO "Clients" ("Id", "ClientName", "State", "GstNumber", "CreatedAt", "UpdatedAt")
    SELECT gen_random_uuid(), o."ClientName",
           MAX(o."State"), MAX(o."GstNumber"), now(), now()
    FROM "Orders" o
    WHERE o."ClientId" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "Clients" c WHERE c."ClientName" = o."ClientName")
    GROUP BY o."ClientName"
    RETURNING "Id", "ClientName"
)
INSERT INTO "MasterOrderGroups" ("Id", "ClientId", "Code", "CreatedAt", "UpdatedAt")
SELECT gen_random_uuid(), c."Id",
       'MO-' || (1000 + ROW_NUMBER() OVER (ORDER BY c."CreatedAt"))::text,
       now(), now()
FROM "Clients" c
WHERE NOT EXISTS (SELECT 1 FROM "MasterOrderGroups" g WHERE g."ClientId" = c."Id");

UPDATE "Orders" o
SET "ClientId" = c."Id",
    "MasterOrderGroupId" = g."Id"
FROM "Clients" c
JOIN "MasterOrderGroups" g ON g."ClientId" = c."Id"
WHERE o."ClientId" IS NULL
  AND c."ClientName" = o."ClientName";
