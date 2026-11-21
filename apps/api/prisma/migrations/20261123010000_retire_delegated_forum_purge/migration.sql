-- Legacy assignments cannot establish immutable platform ownership.
DELETE FROM "role_permissions" AS rp
USING "permissions" AS p
WHERE rp."permissionId" = p."id" AND p."key" = 'forum.content.purge';
