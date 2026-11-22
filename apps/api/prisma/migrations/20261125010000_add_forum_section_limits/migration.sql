-- Part B of the Command Deck section settings
ALTER TABLE "forums"
  ADD COLUMN "attachmentMaxMb" INTEGER,
  ADD COLUMN "attachmentFormats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "autoCloseDays" INTEGER,
  ADD COLUMN "gateViewRole" "ForumAccessRole" NOT NULL DEFAULT 'GUEST',
  ADD COLUMN "gateCreateRole" "ForumAccessRole" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN "gateBlockTypes" TEXT[] NOT NULL DEFAULT ARRAY['TEXT', 'CODE', 'MEDIA', 'FILES']::TEXT[],
  ADD CONSTRAINT "forums_attachment_max_range" CHECK ("attachmentMaxMb" IS NULL OR "attachmentMaxMb" BETWEEN 1 AND 1024),
  ADD CONSTRAINT "forums_auto_close_range" CHECK ("autoCloseDays" IS NULL OR "autoCloseDays" BETWEEN 1 AND 3650),
  ADD CONSTRAINT "forums_gate_create_not_guest" CHECK ("gateCreateRole" <> 'GUEST');

CREATE INDEX "forum_topics_autoclose_idx" ON "forum_topics"("forumId", "state", "lastPostAt");
