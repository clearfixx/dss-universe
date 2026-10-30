from pathlib import Path
root=Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
p=root/'docs/audits/DEBT_091_BOOTSTRAP_EFFECTIVE_DATABASE_TARGET.md'
before=p.read_text(encoding='utf-8')
after=before.replace('Status: OPEN; separate correction not authorized.', 'Status: owner-approved separate correction; candidate verification/acceptance open.',1)
after=after.replace('## Proposed separate package','## Approved separate package',1)
after=after.replace('Runtime/script changes, regressions and full quality acceptance require a\nseparate owner-approved package.', 'Owner approved the separate package and exact policy: no query or only literal\n?schema=public; other parameters, duplicates and fragments are rejected.\nCandidate [PR110](https://github.com/clearfixx/dss-universe/pull/110), head503a6ae,\nimplements the pure policy and six passing isolated regressions in its own branch.\nFull local gate and CI are running; acceptance remains open. Candidate source is\nnot imported into this D7 review branch.',1)
assert after!=before and p.read_text(encoding='utf-8')==before
p.write_text(after,encoding='utf-8',newline='\n')
p=root/'docs/development/DEBT_REGISTER.md'
before=p.read_text(encoding='utf-8')
after=before.replace('Separate guard-policy and\ntest package requires approval.', 'Owner approved the separate guard-policy/test package and exact no-query or\nschema=public policy. Candidate PR110503a6ae has six passing isolated regressions;\nfull gate/CI and scoped acceptance remain open.',1)
assert after!=before
p.write_text(after,encoding='utf-8',newline='\n')
print('Recorded owner approval and isolated PR110 candidate; no source imported.')
