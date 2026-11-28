INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'research-lab.organize', 'Organize Research Lab',
  'Allows managing Research Lab categories and navigation.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('admin', 'owner') AND p."key" = 'research-lab.organize'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
