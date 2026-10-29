from pathlib import Path
import subprocess

root = Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
p = root / 'docs/development/DEBT_REGISTER.md'
before = p.read_text(encoding='utf-8')
assert before.count('<<<<<<< HEAD') == 1
start = before.index('<<<<<<< HEAD\n')
middle = before.index('=======\n', start)
end = before.index('>>>>>>> origin/main\n', middle)
ours = before[start + len('<<<<<<< HEAD\n'):middle]
theirs = before[middle + len('=======\n'):end]
incoming = theirs[:theirs.index('### DEBT-089')]
incoming = incoming.replace('Separate owner-local policy/correction approval is\nrequired before reliable out-of-order consumer acceptance; no runtime fix here.', 'The owner approved a new legitimate qualification cycle under current rules;\nlate events from an old cycle must not restore a revoked award. Detailed protocol\nand runtime correction remain separate work; no runtime fix here.')
heading = '### DEBT-089 — systeminformation Windows command injection (High, RESOLVED scoped patch)\n'
assert ours.endswith(heading)
checkpoint = ('2026-10-29 current checkpoint: owner accepted design/characterization PR108\n'
              'cd40325, merged as ddb685d. CI5/5 and local full gate0 cover E2E688/688\n'
              'and Web15/15 without retries. The owner approved the DEBT-090 new-cycle\n'
              'policy; runtime correction and consumer activation remain unimplemented.\n'
              'PR10910c09eb proposes the detailed C1 protocol with characterization only;\n'
              'its CI5/5 is green, local full gate and acceptance remain pending.\n'
              'D7 acceptance remains open. The following checkpoints are historical.\n\n')
after = before[:start] + checkpoint + incoming + ours + before[end + len('>>>>>>> origin/main\n'):]
assert p.read_text(encoding='utf-8') == before
p.write_text(after, encoding='utf-8', newline='\n')
policy = subprocess.check_output(['git', 'show', '6b315d1:docs/development/DEBT_090_ACHIEVEMENT_ROLLBACK_ORDER.md'], cwd=Path(__file__).resolve().parents[2], text=True, encoding='utf-8')
target = root / 'docs/development/DEBT_090_ACHIEVEMENT_ROLLBACK_ORDER.md'
assert 'DEBT_007_CONSUMER_PROTOCOL' not in policy
target.write_text(policy, encoding='utf-8', newline='\n')
print('Resolved documentation conflict; preserved history and recorded approved policy only.')
