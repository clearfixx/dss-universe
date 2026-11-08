from pathlib import Path
import re
root = Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
files = ['docs/development/DEBT_REGISTER.md', 'docs/audits/D7_BASELINE_RELEASE_REVIEW.md', 'docs/audits/D7_DEBT_DISPOSITION_MATRIX.md']
before = {name: (root/name).read_text(encoding='utf-8') for name in files}
after = dict(before)
def once(text, old, new):
    if text.count(old) != 1: raise RuntimeError('Anchor mismatch: ' + old[:60])
    return text.replace(old, new, 1)
text = after[files[0]]
text = once(text, 'accepted main `701cb87`;', 'accepted main `cc39080`;')
text = once(text, 'maps all89 accepted-register IDs\nexactly once', 'maps89 accepted-register IDs plus confirmed candidate090\nexactly once')
latest = '''
2026-10-29 latest override: owner accepted DEBT-013 PR106a24bb2a, mergedcc39080
at03:16:43UTC. Exact-head CI5/5 and fresh full gate0: coverage8/8, E2E686/686,
Web15/15 without retries. SMTP12525/UI18025, Worker-configured Nodemailer.verify,
same image/volume and two original messages are verified; no unrelated container
restart. The earlier security failure is preserved; accepted107 is integrated.
DEBT-013 is scoped resolved. Current accepted baseline iscc39080.
Separate C design/characterization PR1080d51145 records confirmed candidate090:
Achievements empty rollback permits a late active award until explicit rollback
replay; Points retains absent-source revocation. Focused migrated4/4 supports this
service sequence only. C full gate/CI and owner acceptance are pending; no C
runtime or090 correction is authorized/imported here. Current inventory90 is
89 accepted-register IDs plus confirmed candidate090, not90 resolved debts.

'''
text = once(text, '## Register\n', '## Register\n' + latest + 'Earlier checkpoints, superseded only by the latest scoped acceptance above:\n')
rows = text.splitlines()
for i, row in enumerate(rows):
    if row.startswith('| DEBT-013 |'):
        rows[i] = '| DEBT-013 | High | RESOLVED | Local services | Owner accepted PR106a24bb2a/mergecc39080: configured SMTP12525/UI18025, actual protocols/Nodemailer and mailbox preservation, CI5/5/full gate0, E2E686/686, Web15/15. Earlier outage/security failure retained; OTLP optional/S3 deferred. | D0 / accepted operational packet |'
text = '\n'.join(rows) + '\n'
after[files[0]] = text

text = after[files[1]]
text = once(text, '`701cb870dbe96ec32e824b2076fa5a17bca1d857`.', '`cc39080fe339ad1ca4699d3fa83122b94f46daba`.')
heading = '## 2026-10-29 accepted security patch and Mailpit integration'
latest = '''## 2026-10-29 accepted Mailpit and C characterization checkpoint

Owner accepted PR106a24bb2a, mergedcc39080 at03:16:43UTC. Exact-head CI5/5
and separate full gate0: coverage8/8/API1466/1466, E2E686/686 across64 suites
without skips, build6/6 and Web15/15 without retries. Local gate02:54:22Z–
03:08:49Z had no Windows wake event. CI E2E SHA256:
2486cb888e9a99b2f8c8b30ec610b5e34bfd181f146d93bc54b7ee379b38bef9.
Local E2E SHA256a45e9e6f0c0118e3a18d3817b47c68b02386732fef8d033f906acaadea505f8a.
Working SMTP12525/UI18025 and Nodemailer.verify, same volume/image, two original
messages/unread2 and unchanged other-container timestamps support scoped013
closure. Primary is synchronized to maincc39080; Web/API/Worker/Mailpit readiness
and unchanged owner audit-plan SHA256 were rechecked. The initial security-failed
gate remains preserved; accepted107 is included. No global service uptime or
new D7 release gate is inferred from the scoped accepted package.

[C design/characterization PR108](https://github.com/clearfixx/dss-universe/pull/108),
head0d51145, proposes identifier-only queue references, immutable safe admissions,
separate consumption receipts, mutable-rule revision guards and real second-hop
proof. It is not runtime C permission or automatic award activation. Two added
actual-owner migrated tests pass with the original two (focused4/4). They prove
Points suppresses a late original after absent-source revocation, but Achievements
empty rollback allows a late active award until explicit rollback replay. The
configured beneficiaryId and synthetic rollback name exercise real current
semantics; no production automatic-delivery incident or concurrency proof is
claimed. Candidate DEBT-090 requires owner policy/correction design. PR108 full
gate/CI and owner acceptance remain pending. No unaccepted source is imported.

Current inventory90 means accepted-register IDs001–089 plus confirmed candidate090.
DEBT-007 C/D,090 policy, remaining Q/O/M/R reviews, final D7 gate, stack audit and
Phase11 brainstorm remain open. This checkpoint is documentation-only.

'''
text = once(text, heading, latest + '## Earlier 2026-10-29 checkpoint before Mailpit acceptance')
after[files[1]] = text

text = after[files[2]]
text = once(text, 'Current accepted baseline: `701cb87`;', 'Current accepted baseline: `cc39080`;')
text = once(text, 'Latest override: owner accepted DEBT-089 PR10756ed7da/merge701cb87,', '''Latest override: owner accepted DEBT-013 PR106a24bb2a/mergecc39080,
CI5/5 and its own full gate0, E2E686/686, Web15/15 without retries; scoped013
operational readiness/preservation resolved. Candidate090 is characterized in
C design PR1080d51145; full gate/CI and owner acceptance remain pending, no
runtime consumer or owner correction imported into this review branch.

Earlier override: owner accepted DEBT-089 PR10756ed7da/merge701cb87,''')
text = once(text, 'This covers accepted-register IDs001–089 exactly once.', 'This covers accepted-register IDs001–089 plus confirmed candidate090 exactly once.')
text = once(text, 'It does not say all89 entries are resolved or fully reviewed.', 'It does not say all90 entries are resolved or fully reviewed.')
rows = text.splitlines()
for i, row in enumerate(rows):
    if row.startswith('| DEBT-013 '):
        rows[i] = '| DEBT-013 | C | Owner accepted PR106a24bb2a/mergecc39080: actual SMTP/Nodemailer12525, UI18025, same image/volume/two original messages and other-container timestamps; CI5/5 and own full gate0, E2E686/686, Web15/15. Earlier failure preserved. |'
    if row.startswith('| DEBT-089 '):
        rows[i] = '| DEBT-089 | C | Owner accepted PR10756ed7da/merge701cb87: patch-only dependency, audit0 high/critical, CI5/5/full gate0, E2E686/686, Web15/15. Mailpit integration subsequently accepted separately in PR106. |'
text = '\n'.join(rows) + '\n'
text = once(text, '\n## Execution order from this checkpoint', '''
| DEBT-090 | Q | C characterization PR1080d51145: migrated empty rollback→late original yields active Achievement until rollback replay; Points differs. Focused4/4 is evidence, not correction. Owner-local source-order policy/implementation requires separate approval; no production incident/concurrency claim. |

## Execution order from this checkpoint''')
text = re.sub(r'(?m)(^\| DEBT-\d{3}[^\n]*)\n\n(?=\| DEBT-\d{3})', r'\1\n', text)
text = once(text, 'finish013 integration verification (host protocols work);089/016 are accepted.', 'resolve090/source-order policy and other Q decisions;013/089/016 are accepted.')
after[files[2]] = text
for name in files:
    if (root/name).read_text(encoding='utf-8') != before[name]: raise RuntimeError('Concurrent edit')
for name in files:
    with (root/name).open('w', encoding='utf-8', newline='\n') as handle: handle.write(after[name])
print('Reconciled three D7 Markdown files; accepted106 and candidate090 kept distinct')
