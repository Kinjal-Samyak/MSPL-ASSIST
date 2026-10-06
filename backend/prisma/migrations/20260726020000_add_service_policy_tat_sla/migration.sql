-- TAT & SLA Framework: Service Policy configuration engine (additive only, Slice 1)
CREATE TABLE "PriorityDefinition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "legacyValue" "Priority",
    "displayName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorityDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PriorityDefinition_code_key" ON "PriorityDefinition"("code");
CREATE INDEX "PriorityDefinition_active_idx" ON "PriorityDefinition"("active");
CREATE INDEX "PriorityDefinition_sortOrder_idx" ON "PriorityDefinition"("sortOrder");

CREATE TABLE "DefaultPriorityRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "condition" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "priorityDefinitionId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefaultPriorityRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DefaultPriorityRule_priorityDefinitionId_idx" ON "DefaultPriorityRule"("priorityDefinitionId");

CREATE TABLE "WorkshopSlaTarget" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "priorityDefinitionId" UUID NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopSlaTarget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkshopSlaTarget_priorityDefinitionId_key" ON "WorkshopSlaTarget"("priorityDefinitionId");

CREATE TABLE "StageSlaTarget" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stageKey" TEXT NOT NULL,
    "priorityDefinitionId" UUID NOT NULL,
    "ownerRole" TEXT NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageSlaTarget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StageSlaTarget_stageKey_priorityDefinitionId_key" ON "StageSlaTarget"("stageKey", "priorityDefinitionId");

CREATE TABLE "SlaStatusRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "atRiskThresholdPct" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaStatusRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServicePolicyVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionLabel" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServicePolicyVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ServicePolicyVersion_isCurrent_idx" ON "ServicePolicyVersion"("isCurrent");

CREATE TABLE "TicketPriorityChange" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" UUID NOT NULL,
    "previousPriority" "Priority" NOT NULL,
    "newPriority" "Priority" NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" UUID NOT NULL,
    "changedByRole" "Role" NOT NULL,
    "servicePolicyVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketPriorityChange_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TicketPriorityChange_ticketId_idx" ON "TicketPriorityChange"("ticketId");

-- Ticket / JobCard additive columns (existing columns/enum untouched)
ALTER TABLE "Ticket" ADD COLUMN "priorityDefinitionId" UUID;
ALTER TABLE "Ticket" ADD COLUMN "servicePolicyVersionId" UUID;
ALTER TABLE "Ticket" ADD COLUMN "openedAt" TIMESTAMP(3);
CREATE INDEX "Ticket_priorityDefinitionId_idx" ON "Ticket"("priorityDefinitionId");

ALTER TABLE "JobCard" ADD COLUMN "vehicleReceivedAt" TIMESTAMP(3);
ALTER TABLE "JobCard" ADD COLUMN "repairStartedAt" TIMESTAMP(3);

-- Foreign keys
ALTER TABLE "DefaultPriorityRule" ADD CONSTRAINT "DefaultPriorityRule_priorityDefinitionId_fkey" FOREIGN KEY ("priorityDefinitionId") REFERENCES "PriorityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopSlaTarget" ADD CONSTRAINT "WorkshopSlaTarget_priorityDefinitionId_fkey" FOREIGN KEY ("priorityDefinitionId") REFERENCES "PriorityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StageSlaTarget" ADD CONSTRAINT "StageSlaTarget_priorityDefinitionId_fkey" FOREIGN KEY ("priorityDefinitionId") REFERENCES "PriorityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePolicyVersion" ADD CONSTRAINT "ServicePolicyVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketPriorityChange" ADD CONSTRAINT "TicketPriorityChange_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketPriorityChange" ADD CONSTRAINT "TicketPriorityChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_priorityDefinitionId_fkey" FOREIGN KEY ("priorityDefinitionId") REFERENCES "PriorityDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_servicePolicyVersionId_fkey" FOREIGN KEY ("servicePolicyVersionId") REFERENCES "ServicePolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: PriorityDefinition (mirrors today's 4 Priority enum values 1:1)
INSERT INTO "PriorityDefinition" ("id","code","legacyValue","displayName","colorHex","description","sortOrder","active","updatedAt") VALUES
  (gen_random_uuid(),'P1','CRITICAL','Critical','#EF4444','Vehicle completely non-rideable. High revenue loss.',1,true,CURRENT_TIMESTAMP),
  (gen_random_uuid(),'P2','HIGH','High','#F97316','Vehicle rideable with limited functionality.',2,true,CURRENT_TIMESTAMP),
  (gen_random_uuid(),'P3','MEDIUM','Medium','#3B82F6','Vehicle operational but performance affected.',3,true,CURRENT_TIMESTAMP),
  (gen_random_uuid(),'P4','LOW','Low','#6B7280','Cosmetic or planned maintenance.',4,true,CURRENT_TIMESTAMP);

-- Seed: Default Priority Rules
INSERT INTO "DefaultPriorityRule" ("id","condition","operator","value","priorityDefinitionId","active","updatedAt")
  SELECT gen_random_uuid(), 'VEHICLE_STOPPED', 'EQUALS', 'true', id, true, CURRENT_TIMESTAMP FROM "PriorityDefinition" WHERE code = 'P1';
INSERT INTO "DefaultPriorityRule" ("id","condition","operator","value","priorityDefinitionId","active","updatedAt")
  SELECT gen_random_uuid(), 'VEHICLE_RIDEABLE', 'EQUALS', 'true', id, true, CURRENT_TIMESTAMP FROM "PriorityDefinition" WHERE code = 'P4';

-- Seed: Vehicle Downtime SLA (Workshop SLA) targets
INSERT INTO "WorkshopSlaTarget" ("id","priorityDefinitionId","durationValue","durationUnit","active","updatedAt")
SELECT gen_random_uuid(), pd.id, v.duration_value, v.duration_unit, true, CURRENT_TIMESTAMP
FROM (VALUES
  ('P1', 4, 'HOURS'),
  ('P2', 8, 'HOURS'),
  ('P3', 24, 'HOURS'),
  ('P4', 3, 'BUSINESS_DAYS')
) AS v(priority_code, duration_value, duration_unit)
JOIN "PriorityDefinition" pd ON pd.code = v.priority_code;

-- Seed: Stage SLA targets (7 stages x 4 priorities = 28 rows), matching the frozen spec's table verbatim
INSERT INTO "StageSlaTarget" ("id","stageKey","priorityDefinitionId","ownerRole","durationValue","durationUnit","active","updatedAt")
SELECT gen_random_uuid(), v.stage_key, pd.id, v.owner_role, v.duration_value, v.duration_unit, true, CURRENT_TIMESTAMP
FROM (VALUES
  ('TICKET_RESPONSE','COORDINATOR','P1',15,'MINUTES'),
  ('TICKET_RESPONSE','COORDINATOR','P2',30,'MINUTES'),
  ('TICKET_RESPONSE','COORDINATOR','P3',1,'HOURS'),
  ('TICKET_RESPONSE','COORDINATOR','P4',4,'HOURS'),
  ('TECHNICIAN_ASSIGNMENT','SERVICE_TL','P1',30,'MINUTES'),
  ('TECHNICIAN_ASSIGNMENT','SERVICE_TL','P2',1,'HOURS'),
  ('TECHNICIAN_ASSIGNMENT','SERVICE_TL','P3',2,'HOURS'),
  ('TECHNICIAN_ASSIGNMENT','SERVICE_TL','P4',8,'HOURS'),
  ('INITIAL_DIAGNOSIS','SERVICE_TL','P1',30,'MINUTES'),
  ('INITIAL_DIAGNOSIS','SERVICE_TL','P2',1,'HOURS'),
  ('INITIAL_DIAGNOSIS','SERVICE_TL','P3',2,'HOURS'),
  ('INITIAL_DIAGNOSIS','SERVICE_TL','P4',4,'HOURS'),
  ('SPARE_APPROVAL','SERVICE_TL','P1',15,'MINUTES'),
  ('SPARE_APPROVAL','SERVICE_TL','P2',30,'MINUTES'),
  ('SPARE_APPROVAL','SERVICE_TL','P3',1,'HOURS'),
  ('SPARE_APPROVAL','SERVICE_TL','P4',4,'HOURS'),
  ('REPAIR','TECHNICIAN','P1',4,'HOURS'),
  ('REPAIR','TECHNICIAN','P2',8,'HOURS'),
  ('REPAIR','TECHNICIAN','P3',24,'HOURS'),
  ('REPAIR','TECHNICIAN','P4',3,'BUSINESS_DAYS'),
  ('REDEPLOYMENT','COORDINATOR','P1',30,'MINUTES'),
  ('REDEPLOYMENT','COORDINATOR','P2',1,'HOURS'),
  ('REDEPLOYMENT','COORDINATOR','P3',2,'HOURS'),
  ('REDEPLOYMENT','COORDINATOR','P4',4,'HOURS'),
  ('TICKET_CLOSURE','COORDINATOR','P1',30,'MINUTES'),
  ('TICKET_CLOSURE','COORDINATOR','P2',1,'HOURS'),
  ('TICKET_CLOSURE','COORDINATOR','P3',2,'HOURS'),
  ('TICKET_CLOSURE','COORDINATOR','P4',1,'BUSINESS_DAYS')
) AS v(stage_key, owner_role, priority_code, duration_value, duration_unit)
JOIN "PriorityDefinition" pd ON pd.code = v.priority_code;

-- Seed: SLA Status Rules (single active row)
INSERT INTO "SlaStatusRule" ("id","atRiskThresholdPct","updatedAt") VALUES (gen_random_uuid(), 20, CURRENT_TIMESTAMP);

-- Seed: initial Configuration Version
INSERT INTO "ServicePolicyVersion" ("id","versionLabel","effectiveFrom","isCurrent") VALUES (gen_random_uuid(), 'v1.0', CURRENT_TIMESTAMP, true);

-- Backfill existing tickets: priorityDefinitionId from legacyValue match, servicePolicyVersionId to v1.0
UPDATE "Ticket" t SET "priorityDefinitionId" = pd.id
FROM "PriorityDefinition" pd
WHERE pd."legacyValue" = t."priority" AND t."priorityDefinitionId" IS NULL;

UPDATE "Ticket" SET "servicePolicyVersionId" = (SELECT id FROM "ServicePolicyVersion" WHERE "versionLabel" = 'v1.0' LIMIT 1)
WHERE "servicePolicyVersionId" IS NULL;

-- Backfill existing job cards: vehicleReceivedAt proxy = createdAt (per approved Slice-1 simplification)
UPDATE "JobCard" SET "vehicleReceivedAt" = "createdAt" WHERE "vehicleReceivedAt" IS NULL;
