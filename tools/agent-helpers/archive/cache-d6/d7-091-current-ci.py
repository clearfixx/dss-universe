from pathlib import Path
root=Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
p=root/'docs/audits/DEBT_091_BOOTSTRAP_EFFECTIVE_DATABASE_TARGET.md'
before=p.read_text(encoding='utf-8')
after=before.replace('head503a6ae,','head834ea0b,',1)
after=after.replace('Full local gate and CI are running; acceptance remains open.', 'CI5/5 and its downloaded E2E688/688 across64 suites without skips are verified.\nThe actual CI quality-policy step ran the six new regression groups. A masking\ncase first failed on503a6ae: safe API .env.local hid an unsafe .env used by CLI.\nThe updated guard checks CLI file/process and API local/process views separately;\nthat focused case now passes and its red/green logs are retained.\nA new exact-head full local gate is running sequentially after the prior exit0\nrun. That prior run changed source mid-flight and is superseded evidence, not\ncurrent-head acceptance. Scoped acceptance remains open.',1)
assert after!=before and p.read_text(encoding='utf-8')==before
p.write_text(after,encoding='utf-8',newline='\n')
p=root/'docs/audits/D7_DEBT_DISPOSITION_MATRIX.md'
before=p.read_text(encoding='utf-8')
lines=before.splitlines()
matches=[i for i,line in enumerate(lines) if line.startswith('| DEBT-091 |')]
assert len(matches)==1
lines[matches[0]]='| DEBT-091 | O | Bootstrap query target and CLI/local-env masking defects characterized. Owner approved exact query policy; PR110834ea0b has CI5/5, E2E688/688 and passing isolated regressions. Exact-head local gate/acceptance remain open; no candidate source imported. |'
p.write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
p=root/'docs/development/DEBT_REGISTER.md'
before=p.read_text(encoding='utf-8')
after=before.replace('Candidate PR110503a6ae has six passing isolated regressions;\nfull gate/CI and scoped acceptance remain open.', 'Candidate PR110834ea0b checks CLI and API-local environment views; six isolated\nregression groups and CI5/5 pass, E2E688/688 without skips. Exact-head local full\ngate and scoped acceptance remain open.',1)
assert after!=before
p.write_text(after,encoding='utf-8',newline='\n')
print('D7 records current candidate and retained red/green evidence; acceptance still open.')
