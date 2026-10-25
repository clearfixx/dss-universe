# DEBT-082 — Registered workspace test coverage completeness

Status: owner-approved implementation; complete quality/CI and acceptance open.
Base: accepted main089c52f (PR84). Branch: debt/debt-082-workspace-test-coverage.
Separate from PR80, PR81, PR83, DEBT-066, DEBT-081 and the D7 review.

## Confirmed gap and inventory

The full runner selects Turbo test:cov for --coverage; quality:full and CI use
this mode. Editor has test but no test:cov, so its own specs do not execute there.
Actual Turbo JSON includes an Editor task identity but command NONEXISTENT.
Task identity alone is not proof of execution.

Read all ten app/package manifests and bounded TS/TSX spec inventory:

| Workspace                                | Own registered tests           | Coverage command before correction |
| ---------------------------------------- | ------------------------------ | ---------------------------------- |
| API                                      | yes                            | yes                                |
| Web                                      | yes                            | yes                                |
| Worker                                   | yes                            | yes                                |
| Storage                                  | yes                            | yes                                |
| Editor                                   | yes, three spec files          | **missing**                        |
| Jobs, UI, Types, TSConfig, ESLint config | no own test script/specs found | not applicable                     |

Jobs also has a virtual NONEXISTENT coverage task, but no own tests to omit.
Do not report it as a second reproduced omission. Root Node policy tests are
separately invoked by the existing gate, not workspace test tasks.

Before correction the three Editor specs pass23/23 without coverage, no skipped
tests. This supplements earlier gates; it does not retroactively change what
their coverage task executed. No runtime failure or exploit is proved by this gap.

## Approved correction

Owner approved a separate package: inspect all workspaces with tests, include
currently omitted registered tests in coverage mode and add fail-closed
regressions, without runtime/UI changes or weaker coverage/assertions.

Editor now uses vitest run --coverage --maxWorkers=2 and the same coverage-v8
4.1.11 provider/range already used elsewhere in the repository. Generated lockfile
changes only the Editor importer (three lines); no package versions or integrity
entries changed. No existing assertions, thresholds, skips or timeouts changed.

The coverage runner captures real strict Turbo test and test:cov dry-run graphs
under its existing full-test environment, then requires an executable coverage
command for every executable test command. Missing/blank/NONEXISTENT commands,
duplicate identities, empty required-test sets, malformed JSON and failed
dry-runs stop before workspace execution. Raw graphs are not logged, because
they may contain environment evidence. Existing forced execution, concurrency1,
environment guards and normal non-coverage path remain unchanged.

This policy checks registered executable scripts, not arbitrary unregistered
test filenames or whether a malicious script actually runs every assertion.
Real test reports, code review and the full gate remain required.

## Regression evidence

Before correction: six synthetic policy controls passed; actual Turbo inclusion
and absent runner-preflight checks failed2/8, including the exact omitted Editor
task. The final tests replace the source-only wiring assertion with real runner
processes and a no-IO package-manager fixture.

After correction:12/12 policy tests pass, no skips. Actual Turbo inclusion passes;
real runner rejects missing, malformed and failed plans before the fixture's
execution marker, and allows the complete plan. The fixture does not access DB,
network, browser or application services. Unit controls also cover whitespace
and duplicate/invalid evidence.

Frozen installation exits0. Actual Editor V8 coverage exits0:23/23 tests across
three spec files; statements80.74%, branches75.57%, functions88.67%, lines81.74%.
These measured values are evidence, not new thresholds or a claim of complete
behavioral coverage. Malformed/deep-document DEBT-066 is still a separate change.

Ignored evidence:

- node_modules/.cache/debt066-editor-baseline.json
- node_modules/.cache/debt082-editor-coverage.json
- %TEMP%/dss-debt082-editor-coverage.log
- %TEMP%/dss-debt082-lock.log
- %TEMP%/dss-debt082-frozen-install.log

Full quality/build/audit/CI on this branch is still required; no acceptance or
merge is claimed. Disposable DB5434 and Redis6380 only; no dev5433 reset/migration.

## Accepted no-retry baseline integration — 2026-10-25

Owner accepted PR83 into maina35326a while the first local gate was running at
9ccb6e1. That old-base attempt passed format, architecture, Prisma validation/
generation/drift, lint/types, policies and security audit. Its actual preflight
verified five test workspaces. It was intentionally stopped during API coverage
to integrate the accepted final baseline before complete verification; it is not
a successful full gate or evidence that the test assertions failed. Retained log:
%TEMP%/dss-debt082-quality-full.log, terminal exit-1 from targeted termination.

Only the verified gate process tree was stopped. No foreign process/service,
dev5433 or database reset/migration was involved. Interrupted fixture cleanup is
not certified. All old gate processes were confirmed absent before source changed.
Accepted maina35326a was then merged normally without conflicts; the new complete
gate must use a separate log and the integrated head. No timeout, retry policy,
assertion or dependency version was changed to obtain a green result.
