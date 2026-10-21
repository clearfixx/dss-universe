ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DEACTIVATED';

ALTER TABLE "users"
ADD COLUMN "deactivatedAt" TIMESTAMP(3);

CREATE INDEX "users_status_deactivatedAt_idx"
ON "users" ("status", "deactivatedAt");
