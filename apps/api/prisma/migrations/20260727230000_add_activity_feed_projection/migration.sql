-- CreateEnum
CREATE TYPE "ActivityVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'PRIVATE');

-- CreateTable
CREATE TABLE "activity_entries" (
    "id" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "visibility" "ActivityVisibility" NOT NULL DEFAULT 'MEMBERS',
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "retractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_entries_sourceEventId_key"
ON "activity_entries"("sourceEventId");

-- CreateIndex
CREATE INDEX "activity_entries_actorId_retractedAt_occurredAt_id_idx"
ON "activity_entries"("actorId", "retractedAt", "occurredAt", "id");

-- CreateIndex
CREATE INDEX "activity_entries_module_retractedAt_occurredAt_idx"
ON "activity_entries"("module", "retractedAt", "occurredAt");

-- CreateIndex
CREATE INDEX "activity_entries_subjectType_subjectId_idx"
ON "activity_entries"("subjectType", "subjectId");
