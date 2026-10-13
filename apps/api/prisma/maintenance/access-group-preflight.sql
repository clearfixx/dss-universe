-- ===============================================================
-- 🚀 DSS Universe
-- 📦 Module: IAM migration operations
-- 📄 File: apps/api/prisma/maintenance/access-group-preflight.sql
-- 🎯 Purpose: inventories legacy audiences and Premium-like assignments without writes.
-- ⚠️ Important: run before rollout; review mappings explicitly, never auto-grant from names.
-- 🚀 Build. Share. Grow.
-- ===============================================================
BEGIN TRANSACTION READ ONLY;
SELECT 'premium_like_roles' AS finding, r.id, r.name,
  (SELECT COUNT(*) FROM user_roles ur WHERE ur."roleId"=r.id) AS assignments
FROM roles r WHERE LOWER(r.name)='premium' ORDER BY r.id;

SELECT 'reserved_namespace_roles' AS finding, id, name
FROM roles WHERE name ~* '^(group|role):' ORDER BY id;

SELECT 'group_gate_keys' AS finding, g."groupKey", COUNT(*) AS gates,
  EXISTS(SELECT 1 FROM roles r WHERE LOWER(r.name)=LOWER(g."groupKey") AND r.name !~* '^(group|role):') AS legacy_role_match
FROM content_gate_requirements g WHERE g.kind='GROUP'
GROUP BY g."groupKey" ORDER BY g."groupKey";
COMMIT;
