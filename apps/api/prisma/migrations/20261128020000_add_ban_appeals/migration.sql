-- One appeal per ban with up to five screenshots (owner 2026-11-27).
CREATE TABLE "ban_appeals" (
  "id" TEXT NOT NULL,
  "banId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "decidedById" TEXT,
  "decisionReason" TEXT,
  CONSTRAINT "ban_appeals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ban_appeals_text_length"
    CHECK (char_length("text") BETWEEN 3 AND 1000),
  CONSTRAINT "ban_appeals_status"
    CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  CONSTRAINT "ban_appeals_decision_complete" CHECK (
    ("status" = 'PENDING' AND "decidedAt" IS NULL AND "decidedById" IS NULL AND "decisionReason" IS NULL)
    OR ("status" <> 'PENDING' AND "decidedAt" IS NOT NULL AND "decidedById" IS NOT NULL AND "decisionReason" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "ban_appeals_banId_key" ON "ban_appeals"("banId");
CREATE INDEX "ban_appeals_status_submittedAt_idx" ON "ban_appeals"("status", "submittedAt");
ALTER TABLE "ban_appeals" ADD CONSTRAINT "ban_appeals_banId_fkey"
  FOREIGN KEY ("banId") REFERENCES "account_bans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ban_appeals" ADD CONSTRAINT "ban_appeals_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ban_appeal_files" (
  "id" TEXT NOT NULL,
  "banId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removedAt" TIMESTAMP(3),
  CONSTRAINT "ban_appeal_files_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ban_appeal_files_mediaId_key" ON "ban_appeal_files"("mediaId");
CREATE INDEX "ban_appeal_files_banId_addedAt_idx" ON "ban_appeal_files"("banId", "addedAt");
ALTER TABLE "ban_appeal_files" ADD CONSTRAINT "ban_appeal_files_banId_fkey"
  FOREIGN KEY ("banId") REFERENCES "account_bans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
