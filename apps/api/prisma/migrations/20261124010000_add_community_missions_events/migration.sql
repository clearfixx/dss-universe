-- CreateEnum
CREATE TYPE "CommunityMissionMetric" AS ENUM ('TOPICS', 'REPLIES', 'ACCEPTED_ANSWERS', 'REPUTATION');

-- CreateEnum
CREATE TYPE "CommunityEventFormat" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateTable
CREATE TABLE "community_missions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" "CommunityMissionMetric" NOT NULL,
    "target" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_missions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "community_missions_target_positive" CHECK ("target" > 0),
    CONSTRAINT "community_missions_window" CHECK ("endsAt" > "startsAt")
);

-- CreateTable
CREATE TABLE "community_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "format" "CommunityEventFormat" NOT NULL,
    "location" TEXT,
    "url" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "community_events_duration_positive" CHECK ("durationMinutes" > 0)
);

-- CreateIndex
CREATE INDEX "community_missions_active_startsAt_endsAt_idx" ON "community_missions"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "community_events_startsAt_idx" ON "community_events"("startsAt");

-- AddForeignKey
ALTER TABLE "community_missions" ADD CONSTRAINT "community_missions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Staff permissions
INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid(),
    'missions.manage',
    'Manage community missions',
    'Allows creating, updating and removing community missions.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'events.manage',
    'Manage community events',
    'Allows creating, updating and removing community events.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" IN ('missions.manage', 'events.manage')
WHERE roles."name" IN ('moderator', 'admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
