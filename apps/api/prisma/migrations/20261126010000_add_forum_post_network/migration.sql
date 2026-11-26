-- Forum post network metadata (P1 B11, owner decision D6): IP address and
-- User-Agent of the post author at write time. Staff-only, audited reads,
-- kept until an administrator deletes it.
CREATE TABLE "forum_post_network" (
    "postId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_post_network_pkey" PRIMARY KEY ("postId"),
    CONSTRAINT "forum_post_network_ip_length"
      CHECK ("ipAddress" IS NULL OR char_length("ipAddress") <= 64),
    CONSTRAINT "forum_post_network_ua_length"
      CHECK ("userAgent" IS NULL OR char_length("userAgent") <= 512)
);

ALTER TABLE "forum_post_network"
  ADD CONSTRAINT "forum_post_network_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "forum_posts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'forum.network.view', 'View forum post network data',
   'Allows staff to see the IP address and User-Agent a forum post was written from; every access is audited.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'forum.network.delete', 'Delete forum post network data',
   'Allows manually erasing the stored IP address and User-Agent of a forum post.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

-- D6: Модератор, Супермодератор, Адміністратор see it; deletion is admin.
INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" = 'forum.network.view'
WHERE roles."name" IN ('moderator', 'admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" = 'forum.network.delete'
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
