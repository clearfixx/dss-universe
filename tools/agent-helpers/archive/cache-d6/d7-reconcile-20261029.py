from pathlib import Path
import re

root = Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
targets = ['docs/development/DEBT_REGISTER.md', 'docs/audits/D7_BASELINE_RELEASE_REVIEW.md', 'docs/audits/D7_DEBT_DISPOSITION_MATRIX.md']
before = {name: (root / name).read_text(encoding='utf-8') for name in targets}
after = dict(before)

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Expected one exact documentation anchor: ' + old[:70])
    return text.replace(old, new, 1)

register = after[targets[0]]
conflict = re.search(r'<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> origin/main\n', register, re.S)
if not conflict or register.count('<<<<<<<') != 1:
    raise RuntimeError('Unexpected merge conflict shape')
incoming = conflict.group(2)
incoming = replace_once(incoming, '### DEBT-007 — Automatic gamification delivery (High, runtime B approved; verification open)\n', '')
register = register[:conflict.start()] + incoming + '\nEarlier 2026-10-28 checkpoint (superseded only by the current evidence below):\n\n' + conflict.group(1) + register[conflict.end():]
register = replace_once(register, '> Updated: 2026-10-28', '> Updated: 2026-10-29')
register = replace_once(register, 'D7 review now integrates accepted main `c6b5417`;', 'D7 review now integrates accepted main `5d6db1d`;')
register = replace_once(register, 'maps all87\nunique IDs exactly once', 'maps all88 accepted-register IDs plus confirmed candidate089\nexactly once')
register = replace_once(register, '### DEBT-088 — Host-reserved dev listener ports (Medium, user-requested correction)', '### DEBT-088 — Host-reserved dev listener ports (Medium, RESOLVED scoped correction)')
register = replace_once(register, "A narrow native Node env-file\nlaunch permits a local Web listener override", "A thin Node launcher reads an isolated listener file\nbefore Next boots, permitting a local Web listener override")
register = replace_once(register, 'Full startup/quality/CI and\nacceptance remain open;', 'Owner accepted PR105b0aabaa, merged5d6db1d: actual\nstartup/readiness/CORS verified, CI5/5, local full gate0, E2E686/686 and\nWeb15/15 without retries. This is scoped acceptance;')
checkpoint = '''
2026-10-29 current override: accepted main5d6db1d includes DEBT-088 PR105.
Mailpit host SMTP/UI is now operationally recovered on loopback12525/18025;
same image/volume, two original messages/unread2 and ID fingerprint retained.
Other container IDs/StartedAt are unchanged; own dev process restarted and
Worker-configured Nodemailer.verify passed without DATA. PR10631b8e1c remains
unaccepted: its full gate exited1 on new high advisory GHSA-3f7j-7jwc-fxfj.
Separate patch-only PR10756ed7da fixes systeminformation5.33.15→5.33.16 under
the existing safe patch/minor permission. CI5/5 and local full gate0 support
the candidate, but owner acceptance/merge is pending. After acceptance, PR106
needs integration and its own new full gate. Neither candidate is imported
into this documentation-only D7 branch. DEBT-089 is mapped via the candidate
PR, not falsely described as an already merged register entry.

'''
register = replace_once(register, '## Register\n', '## Register\n' + checkpoint)
after[targets[0]] = register

review = after[targets[1]]
review = replace_once(review, 'Updated: 2026-10-28.', 'Updated: 2026-10-29.')
review = replace_once(review, '`c6b541727a8ce2d53ae5b71867ab6508d0804256`.', '`5d6db1daa4492d641a46b432c76eb8cc727c9734`.')
heading = '## 2026-10-28 routing B acceptance and Mailpit port preflight'
new_review = '''## 2026-10-29 dev startup acceptance and current Mailpit/security checkpoint

Owner accepted DEBT-088 PR105 headb0aabaa, merged5d6db1d at01:07:40UTC.
Actual primary root pnpm dev works on3200/3201: Web200, API readiness200,
database/Redis/queues/Worker up, GraphQL and credentialed CORS verified. CI5/5;
uninterrupted local quality:full exit0, coverage8/8/API1466/1466, E2E686/686
without skips, build6/6, Web15/15 without retries. The gate began on632589a;
only the test's leading Passport comment changed later, with executable body
identity verified. Final b0aabaa CI E2E SHA256:
18e9a8ffe11edb9a605f7af5bc7aa9cfcd43015392b245c8f3b8468d1f337128.
Local E2E SHA256584945759a4344d18d91c72964775c2e581fda3fa331daa8e018ac00e33197a7.
The failed prior run and Windows sleep17:41:41Z→20:32:24Z remain preserved;
not every earlier Media teardown timeout is attributed to sleep. No new D7
release gate or broad stability waiver follows from this scoped acceptance.

OnOctober29 Mailpit-only recovery retained the same image and persistent volume,
all two messages/unread2 and ID fingerprint65fe82afffd97b8c0849791c9dc71dd138cfbae0daf3d7be7718eb1c807b787a.
Host loopback12525/18025 readyz200 and SMTP220/EHLO250/QUIT221 work without DATA;
Worker-configured Nodemailer.verify succeeds. All other container IDs/exact
StartedAt strings are unchanged. An initial PowerShell JSON date-conversion
comparison error was corrected using exact ISO strings; no unrelated service
was restarted. Named ignored SMTP env keys were aligned; the own dev process
was restarted and readiness verified. The owner's untracked audit plan retains
its original SHA256. Earlier empty-binding observations below are historical.

[Mailpit PR106](https://github.com/clearfixx/dss-universe/pull/106), head31b8e1c,
is operationally verified but NOT accepted: local full gate exits1 at security
audit, also confirmed by CI. New high GHSA-3f7j-7jwc-fxfj affects resolved
systeminformation5.33.15. [Separate PR107](https://github.com/clearfixx/dss-universe/pull/107),
head56ed7da, changes only the vulnerable transitive dependency to5.33.16,
actual consumer-path regressions and documentation. CI5/5, strict audit0 high/
critical and local full gate0 (coverage8/8/API1466/1466, E2E686/686, Web15/15)
support it; owner acceptance is still pending. CI E2E SHA256:
a45fb624dc0ff37fe7bab844e45d3554de9094e98ca83f6e996722331874d537.
Local E2E SHA2569a2b06a25c5e9d97c0228ea6de0882cd4de31621ddd7e6600d3a1982e0d90ce3.
After acceptance and merge, PR106 needs integration and its own new full gate.
No unaccepted candidate code is merged into this D7 review branch. Current
inventory is89 known IDs:88 in accepted-register history plus candidate089.
All remaining C/D, Q/O/M/R review and stack-audit/Phase11 boundaries remain.

'''
review = replace_once(review, heading, new_review + heading)
review = replace_once(review, 'The current inventory is87 unique IDs, not87 completed corrections.', 'At this earlier checkpoint the inventory was87 unique IDs, not87 completed corrections; the current89-ID inventory is stated above.')
after[targets[1]] = review

matrix = after[targets[2]]
matrix = replace_once(matrix, 'Updated: 2026-10-28. Current accepted baseline: `c6b5417`;', 'Updated: 2026-10-29. Current accepted baseline: `5d6db1d`;')
matrix = replace_once(matrix, 'Latest override: owner accepted PR102/103 design and runtime B PR104c146c60,', '''Latest override: owner accepted DEBT-088 PR105b0aabaa/merge5d6db1d,
CI5/5 and local full gate0, E2E686/686, Web15/15. Mailpit12525/18025 and
preservation are verified, but PR10631b8e1c acceptance is blocked by new089
security advisory. PR10756ed7da has CI5/5/full gate0 and audit0 high/critical;
owner acceptance/merge is pending. Neither candidate code is imported here.

Earlier checkpoint: owner accepted PR102/103 design and runtime B PR104c146c60,''')
matrix = replace_once(matrix, 'This covers every unique register ID001–087 exactly once. It does not say all\n87 entries are resolved or fully reviewed.', 'This covers accepted-register IDs001–088 plus confirmed candidate089 exactly once.\nIt does not say all89 entries are resolved or fully reviewed.')
lines = matrix.splitlines()
for i, line in enumerate(lines):
    if line.startswith('| DEBT-013 |'):
        lines[i] = '| DEBT-013 | M | Host recovery verified on12525/18025 with same volume/image,2 messages/unread2 and all other container timestamps preserved; Nodemailer.verify succeeds. PR10631b8e1c full gate exits1 at089 audit. Candidate acceptance requires accepted security integration and new full gate; historical PR91 retained. |'
matrix = '\n'.join(lines) + '\n'
matrix = replace_once(matrix, '\n## Execution order from this checkpoint', '''
| DEBT-088 | C | Owner accepted PR105b0aabaa, merge5d6db1d; actual startup/readiness/GraphQL/CORS verified, CI5/5 and local full gate0, E2E686/686, Web15/15. Earlier sleep-interrupted raw log retained; no broad stability waiver. |
| DEBT-089 | M | New high systeminformation advisory blocks PR106. Separate PR10756ed7da patch has strict audit0 high/critical, CI5/5/full gate0, E2E686/686 and Web15/15. Owner acceptance/merge pending; no new exception or candidate import. |

## Execution order from this checkpoint''')
matrix = replace_once(matrix, '2. Obtain Q decisions and reconcile current013 host readiness;016 is accepted. Do not', '2. Obtain Q decisions; accept089 then integrate/reverify013 package (host protocols work).016 is accepted. Do not')
after[targets[2]] = matrix

for name in targets:
    path = root / name
    if path.read_text(encoding='utf-8') != before[name]:
        raise RuntimeError('Documentation changed concurrently')
    if any(marker in after[name] for marker in ['<<<<<<< HEAD', '>>>>>>> origin/main']):
        raise RuntimeError('Unresolved marker')
for name in targets:
    with (root / name).open('w', encoding='utf-8', newline='\n') as handle:
        handle.write(after[name])
print('Updated exactly three D7 Markdown documents; no runtime files changed')
