from pathlib import Path
import re

root = Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
names = ['docs/development/DEBT_REGISTER.md', 'docs/audits/D7_BASELINE_RELEASE_REVIEW.md', 'docs/audits/D7_DEBT_DISPOSITION_MATRIX.md']
before = {name: (root / name).read_text(encoding='utf-8') for name in names}
after = dict(before)

def once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Unexpected documentation anchor: ' + old[:60])
    return text.replace(old, new, 1)

text = after[names[0]]
conflict = re.search(r'<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> origin/main\n', text, re.S)
if not conflict or text.count('<<<<<<<') != 1:
    raise RuntimeError('Unexpected merge conflict')
incoming = once(conflict.group(2), '### DEBT-088 — Host-reserved dev listener ports (Medium, user-requested correction)\n', '')
text = text[:conflict.start()] + incoming + '\nEarlier October29 checkpoint before PR107 acceptance:\n\n' + conflict.group(1) + text[conflict.end():]
text = once(text, '(High, correction candidate)', '(High, RESOLVED scoped patch)')
text = once(text, 'Full quality/CI,\nowner acceptance and downstream Mailpit integration remain open.', 'Owner accepted PR10756ed7da, merged701cb87 at02:51:59UTC: CI5/5, strict\naudit0 high/critical and local full gate0, E2E686/686, Web15/15 without retries.\nMailpit integration head a24bb2a still needs its own full verification/acceptance.')
text = once(text, 'accepted main `5d6db1d`;', 'accepted main `701cb87`;')
text = once(text, 'maps all88 accepted-register IDs plus confirmed candidate089\nexactly once', 'maps all89 accepted-register IDs\nexactly once')
current = '''
2026-10-29 latest override: owner accepted security PR10756ed7da, merged701cb87
at02:51:59UTC. CI5/5, local full gate0, audit0 high/critical, E2E686/686 and
Web15/15 support this scoped patch. Accepted main now includes the new089 entry.
Mailpit host recovery remains operationally verified; PR106 integration head
a24bb2a includes accepted107 and is undergoing its own new full gate/CI.
Its earlier31b8e1c security failure remains preserved. D7 acceptance remains
open; no unaccepted Mailpit implementation is imported into this review branch.

'''
text = once(text, '## Register\n', '## Register\n' + current)
after[names[0]] = text

text = after[names[1]]
text = once(text, '`5d6db1daa4492d641a46b432c76eb8cc727c9734`.', '`701cb870dbe96ec32e824b2076fa5a17bca1d857`.')
heading = '## 2026-10-29 dev startup acceptance and current Mailpit/security checkpoint'
latest = '''## 2026-10-29 accepted security patch and Mailpit integration

Owner accepted DEBT-089 PR107 head56ed7da, merged701cb87 at02:51:59UTC.
The exact head's CI5/5 and full local gate0 are verified: coverage8/8,
API1466/1466, E2E686/686 across64 suites without skips, build6/6, Web15/15
without retries, strict audit0 high/critical. The patch changes only vulnerable
systeminformation5.x resolution to5.33.16 plus actual-path regressions/docs;
the earlier negative floor assertion and failed Mailpit audit are retained.
Local evidence D6 node_modules/.cache/debt089-gate-proof.json records hashes
listed in the earlier checkpoint below. No new exception or remote exploit
claim, architecture/runtime-ownership change, migration or UI change.

Accepted main701cb87 is now integrated into this D7 branch. Mailpit PR106
integration heada24bb2a includes accepted107; primary frozen dependencies were
updated and the own dev process restarted. Its own full gate/CI is running;
neither accepted107's gate nor working host protocols substitute for that gate.
The current inventory is89 IDs001–089 in accepted-register history; this is not
89 resolved debts. Mailpit acceptance, all007 C/D, remaining Q/O/M/R decisions,
final D7 full gate and stack audit remain open. This documentation reconciliation
does not authorize Phase11 or import unaccepted Mailpit candidate source.

'''
text = once(text, heading, latest + '## Earlier 2026-10-29 checkpoint before PR107 acceptance')
after[names[1]] = text

text = after[names[2]]
text = once(text, 'Current accepted baseline: `5d6db1d`;', 'Current accepted baseline: `701cb87`;')
text = once(text, 'Latest override: owner accepted DEBT-088 PR105b0aabaa/merge5d6db1d,', '''Latest override: owner accepted DEBT-089 PR10756ed7da/merge701cb87,
CI5/5, full gate0, audit0 high/critical, E2E686/686, Web15/15 without retries.
013 integration heada24bb2a is under its own new full gate/CI; its host protocols
and preservation are verified, but candidate acceptance remains open.

Earlier override: owner accepted DEBT-088 PR105b0aabaa/merge5d6db1d,''')
text = once(text, 'This covers accepted-register IDs001–088 plus confirmed candidate089 exactly once.', 'This covers accepted-register IDs001–089 exactly once.')
rows = text.splitlines()
for index, row in enumerate(rows):
    if row.startswith('| DEBT-089 '):
        rows[index] = '| DEBT-089 | C | Owner accepted PR10756ed7da, merged701cb87: patch-only resolved dependency, strict audit0 high/critical, CI5/5/full gate0, E2E686/686 and Web15/15. Mailpit integration remains a separate open gate/acceptance. |'
    if row.startswith('| DEBT-013 '):
        rows[index] = '| DEBT-013 | M | Host12525/18025 recovery and message/volume preservation verified; Nodemailer.verify succeeds. PR106 old31b8e1c security failure retained; newa24bb2a integrates accepted107 and is under full gate/CI. Package acceptance remains open. |'
text = '\n'.join(rows) + '\n'
text = once(text, 'accept089 then integrate/reverify013 package (host protocols work).016 is accepted.', 'finish013 integration verification (host protocols work);089/016 are accepted.')
after[names[2]] = text

for name in names:
    if (root / name).read_text(encoding='utf-8') != before[name]:
        raise RuntimeError('Concurrent documentation change')
    if re.search(r'^(<<<<<<<|=======|>>>>>>>)', after[name], re.M):
        raise RuntimeError('Remaining conflict marker')
for name in names:
    with (root / name).open('w', encoding='utf-8', newline='\n') as handle:
        handle.write(after[name])
print('Updated three D7 Markdown files with accepted PR107 and pending Mailpit integration')
