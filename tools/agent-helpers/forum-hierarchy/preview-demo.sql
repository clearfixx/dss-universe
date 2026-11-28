-- Demo tree for visual checks; run only against the disposable dss_preview DB.
WITH root AS (SELECT * FROM forums WHERE title LIKE '[demo]%' AND "parentId" IS NULL LIMIT 1)
INSERT INTO forums (id, "categoryId", "parentId", slug, title, position, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, root."categoryId", root.id, 'demo-sub-' || n,
  (ARRAY['[demo] Перша допомога','[demo] FAQ','[demo] Міграції','[demo] Кешування','[demo] Деплой','[demo] Тестування','[demo] Безпека','[demo] Архів'])[n],
  n, now(), now()
FROM root, generate_series(1, 8) n
ON CONFLICT DO NOTHING;
INSERT INTO forum_moderator_assignments (id, "categoryId", "forumId", "moderatorId", "assignedById", "assignedAt")
SELECT gen_random_uuid()::text, f."categoryId", CASE WHEN u.rn = 1 THEN NULL ELSE f.id END, u.id, u.id, now()
FROM (SELECT * FROM forums WHERE title LIKE '[demo]%' AND "parentId" IS NULL LIMIT 1) f,
  (SELECT id, row_number() OVER (ORDER BY username) rn FROM users ORDER BY username LIMIT 3) u;
