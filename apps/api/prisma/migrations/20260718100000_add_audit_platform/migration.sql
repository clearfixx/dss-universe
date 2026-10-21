CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM', 'SERVICE');
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

CREATE TABLE "audit_records" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS',
    "reason" TEXT,
    "correlationId" TEXT,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_records_action_occurredAt_idx" ON "audit_records"("action", "occurredAt");
CREATE INDEX "audit_records_actorId_occurredAt_idx" ON "audit_records"("actorId", "occurredAt");
CREATE INDEX "audit_records_targetType_targetId_occurredAt_idx" ON "audit_records"("targetType", "targetId", "occurredAt");
CREATE INDEX "audit_records_correlationId_idx" ON "audit_records"("correlationId");
