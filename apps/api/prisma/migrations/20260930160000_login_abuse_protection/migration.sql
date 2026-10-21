ALTER TABLE "users"
  ADD COLUMN "loginFailedAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loginLockedUntil" TIMESTAMP(3);

ALTER TABLE "users"
  ADD CONSTRAINT "users_loginFailedAttempts_check"
  CHECK ("loginFailedAttempts" >= 0);

CREATE INDEX "users_loginLockedUntil_idx" ON "users"("loginLockedUntil");
