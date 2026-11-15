from pathlib import Path
root=Path(r'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe')
p=root/'docs/development/DEBT_REGISTER.md'
before=p.read_text(encoding='utf-8')
rows={
'003': '| DEBT-003 | High | IMPLEMENTED | Module boundaries | Original broad foreign-service dependencies replaced by owner-local ports/root composition; private A/A.1 assemblies preserve provider scope. Existing composition47/47 and migrated DB/HTTP24/24 evidence mapped in D7. Automatic delivery007 and formal D7 acceptance remain separate. | D4 / D7 review |',
'005': '| DEBT-005 | High | IMPLEMENTED | Architecture tooling | Mandatory AST/file-graph inventory and frozen-baseline comparison replace reliance on the legacy subset alone; reviewed140/140 and zero bounded findings. Semantic ownership beyond configured rules and formal D7 acceptance remain separate. | D2–D4 / D7 review |'}
lines=before.splitlines()
for ident,row in rows.items():
 matches=[i for i,line in enumerate(lines) if line.startswith(f'| DEBT-{ident} |')]
 assert len(matches)==1 and '| OPEN ' in lines[matches[0]]
 lines[matches[0]]=row
after='\n'.join(lines)+'\n'
assert p.read_text(encoding='utf-8')==before
p.write_text(after,encoding='utf-8',newline='\n')
p=root/'docs/audits/D7_BASELINE_RELEASE_REVIEW.md'
before=p.read_text(encoding='utf-8')
anchor='## 2026-10-29 accepted C design and scoped development readiness'
assert before.count(anchor)==1
section='''## 2026-10-29 implementation-status reconciliation

The central register's original OPEN text for003/005 lagged implementation.
Reputation, Achievements, Community Points and Levels module/service assemblies
were re-inspected at accepted source baseline ddb685d (the bootstrap candidate
changes no apps/api source). They consume owned contracts; public feature modules
export narrow reader tokens or no broad service, while private provider modules
remain owner-internal. Accepted A/A.1 shares private graphs rather than opening
them to foreign modules. The earlier47/47 composition and migrated24/24 DB/HTTP
cohorts remain retained scoped evidence; accepted108 also has full E2E688/688.

For005, architecture:check mandates the AST/frozen-baseline report as well as the
legacy subset and regression suites. Existing reviewed140/140 and zero bounded
findings establish implementation of that tooling rollout. They do not prove
every dynamic/transitive semantic ownership rule. Register003/005 now truthfully
say IMPLEMENTED pending D7 acceptance, not RESOLVED. DEBT-004 transitive/source
scope,007 automatic delivery and remaining individual review are not waived.
No application, checker, baseline identity or test was changed by this checkpoint.

'''
p.write_text(before.replace(anchor,section+anchor,1),encoding='utf-8',newline='\n')
print('Reconciled original OPEN text to scoped IMPLEMENTED, not release closure.')
