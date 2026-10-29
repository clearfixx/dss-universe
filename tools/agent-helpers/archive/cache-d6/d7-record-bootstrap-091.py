from pathlib import Path
import json, hashlib
root=Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
proof_path=Path(__file__).with_name('d7-bootstrap-isolated-probe.json')
proof=json.loads(proof_path.read_text())
assert len(proof['results'])==3 and all(r['guardPassed'] and r['seedCommandReached'] and r['realConnections']==0 for r in proof['results'])
digest=hashlib.sha256(proof_path.read_bytes()).hexdigest()
target=root/'docs/audits/DEBT_091_BOOTSTRAP_EFFECTIVE_DATABASE_TARGET.md'
assert not target.exists()
target.write_text(f'''# DEBT-091 — Bootstrap effective database target guard

Date: 2026-10-29. Status: OPEN; separate correction not authorized.
Scope: development bootstrap safety, discovered during DEBT-031 D7 review.

## Confirmed evidence

The current bootstrap validates URL authority host/port/user/database against
local root Compose before installation, deployment and seed. It does not inspect
query-parameter coordinate overrides. The actual seed uses PrismaPg with
process.env.DATABASE_URL; PrismaPg delegates PostgreSQL connections to pg.

An isolated VM evaluates the current bootstrap control flow with virtual files,
synthetic credentials, stubbed child processes and no network. Plain local URL
passes as expected. The same authority with host=synthetic.invalid or port=6543
in the query also passes and reaches stubbed deploy/seed commands. The installed
pg Client constructor resolves the former to synthetic.invalid and the latter
to6543. No Client.connect/query is called. Every case has zero real child
processes, connections and file writes. The probe itself only saves its report.

Source anchors: scripts/bootstrap.mjs local coordinate guard;
apps/api/prisma/seed.ts PrismaPg connectionString;
apps/api/prisma.config.ts seed command and datasource URL.
Probe checkedAt: {proof['checkedAt']}.
Report SHA256: {digest}.
Ignored evidence in D6: node_modules/.cache/d7-bootstrap-isolated-probe.mjs and
node_modules/.cache/d7-bootstrap-isolated-probe.json.
The first harness attempt lacked the VM URL global and failed before producing
evidence; providing the standard URL constructor corrected the harness only.

## Risk and limits

The guard does not prove that the effective PostgreSQL driver target remains
local. This is a safety gap for manually supplied or inherited environment URLs,
not proof of remote access, data mutation or current-primary compromise. Current
primary effective coordinates were independently verified local. Prisma migrate
engine URL interpretation and real deploy/seed were deliberately not executed;
do not claim that migration itself reached an external database.

## Proposed separate package

Review a strict URL query policy before install/up/deploy/seed, preserving the
generated schema=public URL and reviewed legitimate local options. Fail closed
on unreviewed target overrides rather than rewriting credentials or silently
changing user configuration. Characterize API and Worker file/process layers,
encoded/duplicate query keys and supported connection options. Use virtual or
stubbed commands and driver metadata; no remote connection is required.

Runtime/script changes, regressions and full quality acceptance require a
separate owner-approved package. DEBT-031 remains open routeM; DEBT-012/030/032
scoped readiness does not waive arbitrary override safety. No production UI,
scoring rule, database migration or service restart is included here.
''',encoding='utf-8',newline='\n')
p=root/'docs/development/DEBT_REGISTER.md'
before=p.read_text(encoding='utf-8')
assert '### DEBT-091' not in before
entry='''### DEBT-091 — Bootstrap effective database target overrides (High, OPEN)

Isolated current-source bootstrap control flow accepts local URL authority with
query host/port overrides and reaches stubbed deploy/seed; installed pg metadata
resolves a different effective target. Seed uses PrismaPg. No real command,
connection, migration or seed ran; migrate-engine interpretation is untested and
current primary effective coordinates remain local. Separate guard-policy and
test package requires approval. [Evidence and limits](../audits/DEBT_091_BOOTSTRAP_EFFECTIVE_DATABASE_TARGET.md).

'''
after=before.replace('## Register\n','## Register\n\n'+entry,1)
assert p.read_text(encoding='utf-8')==before
p.write_text(after,encoding='utf-8',newline='\n')
p=root/'docs/audits/D7_DEBT_DISPOSITION_MATRIX.md'
before=p.read_text(encoding='utf-8')
after=before.replace('This covers accepted-register IDs001–090 exactly once.','This covers accepted-register IDs001–090 plus confirmed review finding091 exactly once.',1)
after=after.replace('It does not say all90 entries are resolved or fully reviewed.','It does not say all91 entries are resolved or fully reviewed.',1)
lines=after.splitlines()
indices=[i for i,line in enumerate(lines) if line.startswith('| DEBT-090 |')]
assert len(indices)==1
lines.insert(indices[0]+1,'| DEBT-091 | O | Isolated bootstrap guard accepts query host/port overrides while pg resolves a different target; stubbed deploy/seed reached, no real connection/migration. Separate correction approval required; see DEBT_091_BOOTSTRAP_EFFECTIVE_DATABASE_TARGET.md. |')
p.write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
print('Recorded confirmed scoped bootstrap guard finding091; runtime unchanged.')
