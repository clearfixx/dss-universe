from pathlib import Path
import json, hashlib, re

root = Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
proof_path = Path(__file__).with_name('d7-dev-scope-probe.json')
proof = json.loads(proof_path.read_text())
assert all(proof['checks'].values())
assert all(c['running'] and c['imageMatches'] and c['loopbackMappingsMatch'] for c in proof['containers'])
assert proof['clamavHostPing'] == 'PONG'
digest = hashlib.sha256(proof_path.read_bytes()).hexdigest()

p = root / 'docs/audits/D7_BASELINE_RELEASE_REVIEW.md'
before = p.read_text(encoding='utf-8')
after = before.replace('Current accepted baseline: `cc39080fe339ad1ca4699d3fa83122b94f46daba`.', 'Current accepted baseline: `ddb685d9df9cabc0e9f54ca70dcb2c45ed02dfea`.', 1)
anchor = '## 2026-10-29 accepted Mailpit and C characterization checkpoint'
assert after.count(anchor) == 1
section = f'''## 2026-10-29 accepted C design and scoped development readiness

Owner accepted PR108 head cd40325, merged ddb685d. Exact-head CI5/5 and
local full gate0 cover E2E688/688 without skips, coverage8/8 and Web15/15
without retries. CI E2E SHA256:
ba279c3e154a2cca603c6f8b1f56d3e495670086a9fc8da02a167cd43d0b5ced.
Owner approved the DEBT-090 policy: late old-cycle events cannot restore a
revoked award; a new legitimate qualification cycle may qualify under current
rules. Detailed protocol PR10910c09eb is not accepted runtime implementation.
DEBT-007 C/D and DEBT-090 correction remain open. Inventory001–090 is now in
accepted register history; this does not mean90 closed debts.

Read-only local development probe at {proof['checkedAt']} verifies effective
API/Worker DB and Redis coordinates against root Compose, required Auth key
presence, documented development Media signing fallback, Web3200/API3201
public endpoints, exact credentialed CORS, GraphQL Query response and matching
reset/verification links. Web200, API readinessok, Workerup, pgAdmin200 and
Mailpit readyz200 were observed. No credential values are recorded here.

Running dev PostgreSQL/Redis/pgAdmin/Mailpit/ClamAV and disposable test
PostgreSQL/Redis match configured image references and exact loopback port
bindings. Every configured healthcheck is healthy. pgAdmin has no configured
healthcheck: its evidence is running state, matching pinned source image and
HTTP200, not a Docker health assertion. Its source digest is
dpage/pgadmin4@sha256:c332c5f6dfba995d9ebc4af261d93506d6876085d712eaaa3defc8dd1a3f26de.
Host ClamAV PING returned PONG; this is daemon readiness, not a complete
malware/upload-path certification. Probe SHA256: {digest}.
Ignored local evidence: D6 node_modules/.cache/d7-dev-scope-probe.json.

This maps original development-only DEBT-012/030/032 to scoped routeC together
with accepted dev-port PR105, security PR107 and Mailpit PR106 full gates.
No environment mutation, DB migration/reset, mail DATA, upload or unrelated
service restart occurred in the probe. This does not certify production,
all Auth flows, arbitrary process/URL overrides (DEBT-031), optional persistent
observability (DEBT-033), global uptime or a new D7 full gate. D7 acceptance
remains open. Earlier checkpoint statements below retain their historical date.

'''
after = after.replace(anchor, section + '## Earlier 2026-10-29 Mailpit and C characterization checkpoint', 1)
assert p.read_text(encoding='utf-8') == before
p.write_text(after, encoding='utf-8', newline='\n')

p = root / 'docs/audits/D7_DEBT_DISPOSITION_MATRIX.md'
before = p.read_text(encoding='utf-8')
after = before.replace('This covers accepted-register IDs001–089 plus confirmed candidate090 exactly once.', 'This covers accepted-register IDs001–090 exactly once.', 1)
rows = {
'012': 'Effective API/Worker local DB/Redis alignment, Auth key presence and documented development signing fallback verified at2026-10-29T04:36:21Z; accepted supporting gates mapped in review. Production and arbitrary overrides excluded.',
'030': 'Approved local override3200/3201 verified through Web/GraphQL/API, exact credentialed CORS and reset/verification links; defaults/examples3001 retained. Scope is current local development endpoints.',
'032': 'Configured dev/test images, exact loopback bindings and running state match; configured healthchecks healthy, pgAdmin digest and HTTP200 verified (no pgAdmin healthcheck). Mailpit/ClamAV host readiness checked; not global uptime.'}
lines = after.splitlines()
for ident, description in rows.items():
    found = [i for i, line in enumerate(lines) if line.startswith(f'| DEBT-{ident} |')]
    assert len(found) == 1
    lines[found[0]] = f'| DEBT-{ident} | C | {description} |'
after = '\n'.join(lines) + '\n'
assert p.read_text(encoding='utf-8') == before
p.write_text(after, encoding='utf-8', newline='\n')
print('Mapped scoped dev readiness with explicit limitations; D7 remains open.')
