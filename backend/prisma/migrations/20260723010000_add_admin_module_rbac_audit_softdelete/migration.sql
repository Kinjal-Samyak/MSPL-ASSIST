-- User: lockout / password tracking fields
ALTER TABLE "User"
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
  ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedAt" TIMESTAMP(3);

-- Ticket: soft-delete + Ready-for-Delivery queue fields
ALTER TABLE "Ticket"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByName" TEXT,
  ADD COLUMN "deleteReason" TEXT,
  ADD COLUMN "deliveryScheduledAt" TIMESTAMP(3),
  ADD COLUMN "customerAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "customerAcknowledgedBy" TEXT;

CREATE INDEX "Ticket_deletedAt_idx" ON "Ticket"("deletedAt");

-- Permission: dynamic RBAC catalog
CREATE TABLE "Permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- RolePermission: role -> permission grants
CREATE TABLE "RolePermission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role" "Role" NOT NULL,
    "permissionId" UUID NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AuditLog: centralized admin action audit trail
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedById" UUID,
    "performedByName" TEXT,
    "performedByRole" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_performedAt_idx" ON "AuditLog"("performedAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
