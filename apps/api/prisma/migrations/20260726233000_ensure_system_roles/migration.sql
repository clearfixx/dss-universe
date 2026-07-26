INSERT INTO "roles" (
    "id",
    "name",
    "label",
    "description",
    "isSystem",
    "createdAt",
    "updatedAt"
)
VALUES
    (gen_random_uuid(), 'user', 'User', 'Default registered user.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'moderator', 'Moderator', 'Community moderation role.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'admin', 'Administrator', 'System administration role.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'owner', 'Owner', 'Highest system role with full access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "isSystem" = true,
    "updatedAt" = CURRENT_TIMESTAMP;
