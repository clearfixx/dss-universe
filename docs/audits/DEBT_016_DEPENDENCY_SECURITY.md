# DEBT-016 — Bounded dependency security correction

Status: owner-approved implementation; verification/acceptance open.
Base: accepted main f118d82. Branch: debt/debt-016-dependency-security.
Separate from PR80 (REST validation), PR81 (tombstones), PR83 (smoke policy),
D7 review and DEBT-081 production research. No merge authority inferred.

## Scope and evidence

Owner approved Next/config correction, then explicitly expanded the package to
all seven current blocking advisories, including required safe patch/minor and
transitive updates. No stack migration, UI redesign, application behavior rewrite
or new security exception. Moderate/low findings remain visible, not declared
resolved by a high/critical gate. No DSS exploit is claimed by a registry finding.

| Packages                             | Candidate / supported floor      | Primary advisory                                                                                                                                                                                                                                                                             |
| ------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next and matching eslint-config-next | 16.4.1                           | [Image optimization](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), [typed-array cache](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) |
| Zod4                                 | >=4.6.6, stay4.x                 | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)                                                                                                                                                                                                                     |
| body-parser2                         | 2.4.0, scoped2.x override        | [GHSA-27r3-jxmh-p828](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828)                                                                                                                                                                                      |
| multer2                              | 2.5.0, tighten existing override | [GHSA-q7qp-rjg7-q26m](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m)                                                                                                                                                                                           |
| undici7                              | 7.30.1, scoped7.x override       | [GHSA-xjj6-f33q-929c](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c)                                                                                                                                                                                              |

Official advisories were fetched and their patched ranges inspected2026-10-24;
Initial npm lookups returned candidate metadata and compatible engines for Node24.
Contradictory resolution attempts are retained below as history; installation
later succeeded as recorded in the 2026-10-25 checkpoint.
Keep approved Node24.18.0/pnpm11.9.0. Do not disable supply-chain protections,
install scripts policy, audit enforcement or the existing exact braces verifier.

## Avoid incompatible transitive substitution

Current tree has Zod3.25.76 under shadcn4.21.4/registry0.1.3 and dual-major MCP,
plus Zod4.6.5 for Web/lint. Do not globally force Zod3 consumers onto4. Instead,
upstream shadcn minor4.22.1 declares Zod^4.2.0 and registry0.2.0, whose declared
Zod range is also^4.2.0. MCP1.32.1 supports^3.25 OR^4, as does its JSON schema
adapter peer contract. These are verified npm package declarations, not inferred
source compatibility. Upgrade the owning CLI minor and review its resolved tree;
do not regenerate components, run shadcn add or alter UI source.

Existing body-parser is2.3.0 through Apollo and both Express consumers; multer2.4.0
through Nest; undici7.30.0 through CLI/registry/dotenvx/jsdom. Overrides target only
the observed vulnerable major, preserving other supported majors. No unrelated
dependency refresh is intended; review generated lockfile before installing.

## Verification contract

New four actual-consumer-path tests fail before changes: Next/config/Sharp,
Web/CLI/registry/MCP Zod, Apollo/Nest parsers and CLI/jsdom undici. Stable patched
floors and supported majors are asserted; this is representative resolution
coverage, not exhaustive graph or exploit proof. Full raw audit remains mandatory.
Connect these regressions to existing test:security-policy so CI and full gate
execute them. Keep brace patch regressions and all existing API/Web/Worker tests.

Generate/review lockfile, install without policy bypass, check real dependency
paths and raw security output, then full quality (disposable5434/6380), actual
production build, generated schema/client consistency, strict E2E and browser
smoke with retries0. A failure remains visible; do not retry to green or weaken
assertions. PR83's no-retry CI policy is not yet accepted main, so separate
zero-retry browser evidence is required here. Runtime/DTO/privacy defects remain
their own approved packets, not dependency-update scope.

## Interrupted resolution checkpoint

`pnpm install --lockfile-only --ignore-scripts` terminated exit1. npm requests
repeatedly failed with ECONNRESET/fetch failures; independent10s HTTPS probes to
registry.npmjs.org and api.github.com both timed out. The CI status request also
terminated with a TCP connection timeout. No live process is assumed from an old
handle; these calls are terminal.

Resolution additionally reported ERR_PNPM_NO_MATCHING_VERSION for
eslint-config-next16.4.1 and listed latest16.4.0, contradicting the earlier
successful version/peer metadata lookup. Do not claim the release is absent,
installed or safe to substitute based on these inconsistent network/cache
observations. Revalidate registry data once connectivity returns. Do not disable
TLS, change registry/proxy/DNS or bypass package-manager protections.

Ignored raw resolution log: `%TEMP%/dss-debt016-lock-resolution.log`.
pnpm-lock.yaml remains unchanged; candidate manifest/override edits and four
red-before-correction regression tests are work in progress. No successful
dependency installation, patched audit, quality/build or security PR is claimed.
The source plan is not a security fix until actual resolution and full gates pass.

## Connectivity recovery and lockfile checkpoint — 2026-10-25

The preceding section records the failed attempt, not the current lockfile state.
Independent Node HTTPS probes subsequently returned HTTP200 for both full and
install-v1 npm manifests, including qs6.16.1 and eslint-config-next16.4.1.
Two later lockfile resolutions completed with exit0. A command-local metadata
cache was used; registry, TLS, DNS, proxy and supply-chain policies were unchanged.
This supports transient connectivity/metadata trouble, not a proven single root
cause for every earlier failure.

Review of the first generated lockfile found compatible indirect consumers still
resolving Zod4.6.5. A scoped Zod4 patched-floor override was added and the lockfile
regenerated successfully. Its only Zod package is now4.6.7; supported shadcn4.22.1
and registry0.2.0 remove the former Zod3 path without a blanket major override.
Next/config are16.4.1, body-parser2.4.0, multer2.5.0, undici7.30.1 and the required
qs6.16.1. React, Node, pnpm and unrelated direct importer versions are unchanged.
Existing OpenTelemetry packages only gained registry deprecation annotations.

Frozen installation is in progress, with resolution skipped and supply-chain
policy verification passed. This is not yet successful installation, green
security audit, full quality acceptance or authority to merge.

Ignored logs: `%TEMP%/dss-debt016-lock-f-cache.log`,
`%TEMP%/dss-debt016-lock-zod-floor.log`,
`%TEMP%/dss-debt016-frozen-install.log`.

Frozen installation subsequently completed exit0. Actual-consumer security tests
are13/13 and the unchanged braces regressions14/14. The first consumer-test run
was12/13 because MCP's root export points to a missing index; using its declared
client export fixes metadata resolution without changing SDK/runtime code.
The real security check completed exit0: high0, critical0, moderate17, low2.
Thus the seven blocking advisories are absent in this audit, not every advisory.
No new exception was introduced. Peer checking still reports the existing Apollo
Playground plugin's server4 requirement against server5.5.1; these versions were
not changed by this packet. Full quality/build/CI acceptance remains pending.
