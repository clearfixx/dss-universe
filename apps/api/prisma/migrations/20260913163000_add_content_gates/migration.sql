CREATE TYPE "ContentGateOperator" AS ENUM ('ALL', 'ANY');
CREATE TYPE "ContentGateRequirementKind" AS ENUM ('ACCOUNT_AGE_DAYS', 'COMMENTS', 'FORUM_POSTS', 'PUBLICATIONS', 'REPUTATION', 'GROUP');

CREATE TABLE "content_gates" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "operator" "ContentGateOperator" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_gates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_gate_requirements" (
  "id" TEXT NOT NULL,
  "gateId" TEXT NOT NULL,
  "kind" "ContentGateRequirementKind" NOT NULL,
  "threshold" INTEGER,
  "groupKey" TEXT,
  CONSTRAINT "content_gate_requirements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_gates_ownerId_createdAt_idx" ON "content_gates"("ownerId", "createdAt");
CREATE INDEX "content_gate_requirements_gateId_idx" ON "content_gate_requirements"("gateId");
CREATE UNIQUE INDEX "content_gate_requirements_gateId_kind_key" ON "content_gate_requirements"("gateId", "kind");
ALTER TABLE "content_gates" ADD CONSTRAINT "content_gates_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_gate_requirements" ADD CONSTRAINT "content_gate_requirements_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "content_gates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
