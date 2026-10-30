from pathlib import Path
root = Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
p = root / 'docs/audits/D7_DEBT_DISPOSITION_MATRIX.md'
before = p.read_text(encoding='utf-8')
after = before.replace('Current accepted baseline: `cc39080`', 'Current accepted baseline: `ddb685d`', 1)
anchor = 'Latest override: owner accepted DEBT-013'
assert after.count(anchor) == 1
after = after.replace(anchor, 'Latest checkpoint: PR108cd40325 is accepted and merged as ddb685d; CI5/5,\nlocal full gate0, E2E688/688 and Web15/15 without retries. DEBT-090 policy is\napproved: new legitimate qualification cycles may qualify under current rules;\nlate old-cycle events must not restore revoked awards. Detailed C1 protocol\nPR10910c09eb is a separate unaccepted proposal, not a runtime correction.\nInventory90 now includes the accepted register entry090; D7 remains open.\n\nEarlier checkpoint: owner accepted DEBT-013', 1)
lines = after.splitlines()
matches = [i for i, line in enumerate(lines) if line.startswith('| DEBT-090 |')]
assert len(matches) == 1
lines[matches[0]] = '| DEBT-090 | M | Accepted PR108 characterization confirms legacy rollback ordering gap. Owner approved new legitimate cycles under current rules and rejecting late old-cycle restoration. Detailed C1 protocol PR109 and runtime correction remain unaccepted/unimplemented; no production incident or concurrency claim. |'
after = '\n'.join(lines) + '\n'
assert p.read_text(encoding='utf-8') == before
p.write_text(after, encoding='utf-8', newline='\n')
print('Updated current D7 baseline and scoped DEBT-090 disposition.')
