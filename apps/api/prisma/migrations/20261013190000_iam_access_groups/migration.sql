-- DSS File Passport
-- File: apps/api/prisma/migrations/20261013190000_iam_access_groups/migration.sql
-- Purpose: Adds isolated access memberships, closed capabilities and immutable grant history.
-- No legacy roles or assignments are converted automatically.

CREATE TYPE "AccessGroupKind" AS ENUM ('CUSTOM', 'PREMIUM');
CREATE TYPE "AccessGroupCapabilityKey" AS ENUM ('KNOWLEDGE_FORGE_GUARDIAN');

CREATE TABLE "access_groups" (
  "id" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "displayName" VARCHAR(96) NOT NULL,
  "kind" "AccessGroupKind" NOT NULL DEFAULT 'CUSTOM',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "color" VARCHAR(7),
  "badgeLabel" VARCHAR(64),
  "icon" VARCHAR(64),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "access_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "access_groups_key_format" CHECK ("key" ~ '^[a-z][a-z0-9-]{0,63}$'),
  CONSTRAINT "access_groups_premium_identity" CHECK (("kind" = 'PREMIUM') = ("key" = 'premium')),
  CONSTRAINT "access_groups_nonempty_name" CHECK (length(trim("displayName")) > 0),
  CONSTRAINT "access_groups_color_format" CHECK ("color" IS NULL OR "color" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "access_groups_icon_format" CHECK ("icon" IS NULL OR "icon" ~ '^[a-z][a-z0-9-]{0,63}$')
);
CREATE UNIQUE INDEX "access_groups_key_key" ON "access_groups"("key");
CREATE UNIQUE INDEX "access_groups_one_premium" ON "access_groups"("kind") WHERE "kind" = 'PREMIUM';

CREATE TABLE "access_group_memberships" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "grantedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revokeReason" VARCHAR(500),
  CONSTRAINT "access_group_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "access_group_memberships_period" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom"),
  CONSTRAINT "access_group_memberships_revocation" CHECK (
    ("revokedAt" IS NULL AND "revokedById" IS NULL AND "revokeReason" IS NULL) OR
    ("revokedAt" IS NOT NULL AND "revokedById" IS NOT NULL AND "revokeReason" IS NOT NULL AND length(trim("revokeReason")) > 0)
  ),
  CONSTRAINT "access_group_memberships_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "access_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "access_group_memberships_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "access_membership_validity_idx" ON "access_group_memberships"("subjectId", "revokedAt", "validFrom", "validUntil");
CREATE INDEX "access_group_memberships_groupId_subjectId_idx" ON "access_group_memberships"("groupId", "subjectId");

CREATE TABLE "access_group_capabilities" (
  "groupId" TEXT NOT NULL,
  "key" "AccessGroupCapabilityKey" NOT NULL,
  CONSTRAINT "access_group_capabilities_pkey" PRIMARY KEY ("groupId", "key"),
  CONSTRAINT "access_group_capabilities_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "access_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE FUNCTION "protect_access_group_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."id", NEW."key", NEW."kind", NEW."createdById", NEW."createdAt")
    IS DISTINCT FROM ROW(OLD."id", OLD."key", OLD."kind", OLD."createdById", OLD."createdAt") THEN
    RAISE EXCEPTION 'Access group identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "access_group_identity_guard" BEFORE UPDATE ON "access_groups"
FOR EACH ROW EXECUTE FUNCTION "protect_access_group_identity"();

CREATE FUNCTION "protect_access_membership_history"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Access membership history cannot be deleted'; END IF;
  IF ROW(NEW."id", NEW."groupId", NEW."subjectId", NEW."validFrom", NEW."validUntil", NEW."grantedById", NEW."createdAt")
    IS DISTINCT FROM ROW(OLD."id", OLD."groupId", OLD."subjectId", OLD."validFrom", OLD."validUntil", OLD."grantedById", OLD."createdAt") THEN
    RAISE EXCEPTION 'Access membership grant is immutable';
  END IF;
  IF OLD."revokedAt" IS NOT NULL AND ROW(NEW."revokedAt", NEW."revokedById", NEW."revokeReason")
    IS DISTINCT FROM ROW(OLD."revokedAt", OLD."revokedById", OLD."revokeReason") THEN
    RAISE EXCEPTION 'Access membership revocation is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "access_membership_history_guard" BEFORE UPDATE OR DELETE ON "access_group_memberships"
FOR EACH ROW EXECUTE FUNCTION "protect_access_membership_history"();

CREATE FUNCTION "protect_premium_capabilities"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE group_kind TEXT;
BEGIN
  EXECUTE format('SELECT kind::text FROM %I.access_groups WHERE id=$1', TG_TABLE_SCHEMA)
    INTO group_kind USING NEW."groupId";
  IF group_kind = 'PREMIUM' THEN
    RAISE EXCEPTION 'Premium cannot grant delegated capabilities';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "premium_capability_guard" BEFORE INSERT OR UPDATE ON "access_group_capabilities"
FOR EACH ROW EXECUTE FUNCTION "protect_premium_capabilities"();

INSERT INTO "access_groups" ("id", "key", "displayName", "kind", "createdById", "updatedAt")
VALUES ('28d0a68d-0f24-4d92-9fe2-28eec10b3b10', 'premium', 'Premium', 'PREMIUM', 'system:migration:D3.5', CURRENT_TIMESTAMP);
INSERT INTO "audit_records" ("id", "action", "actorType", "targetType", "targetId", "metadata")
VALUES ('996f278a-822d-41af-a436-0ce2d016704e', 'iam.access-group.created', 'SYSTEM', 'AccessGroup', '28d0a68d-0f24-4d92-9fe2-28eec10b3b10', '{"key":"premium","source":"D3.5 additive migration","membershipsConverted":0}');
