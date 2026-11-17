# Node 24.22.3 security update

Date: 2026-11-17. Scope: runtime/toolchain security maintenance after the
finite stack audit. Status: verified locally; CI evidence is attached to the
package PR.

## Change

The exact DSS runtime pin moved from Node `24.18.0` to the supported LTS
security release `24.22.3`. The update is coordinated across `.node-version`,
`.nvmrc`, `package.json` engines, current onboarding/roadmap documentation and
active agent verification helpers. GitHub Actions already consume
`.node-version`; a fail-closed repository test now verifies that all workflows
using `actions/setup-node` continue to do so and that no independent literal
pin is introduced.

The release addresses the runtime findings identified by the stack audit. No
dependency versions, application API, database schema, frontend behavior or
production activation policy changed in this package. The developer's global
Node installation was not modified.

## Verification

- official archive checksum verified by the existing pinned-runtime helper;
- frozen-lockfile install remained unchanged;
- security policy: `16/16`;
- storage native addon rebuilt with node-gyp for `24.22.3`; local native suite:
  `48/48`;
- exact-head `quality:full`: exit `0`, schema drift absent, API E2E `939/939`
  across `83/83` suites with no skips/todo, build `6/6`, Web smoke `15/15`
  without retries;
- the first full-gate attempt is retained as a failed receipt: Windows resolved
  the `WindowsApps` Python launcher rather than an executable interpreter. The
  rerun used an existing Python `3.10.8`, retained the same source head and
  passed. This was a local native-build configuration failure, not a Node
  compatibility defect.

This verification covers the repository's supported checks and native Windows
build. Multi-OS native evidence remains the responsibility of CI. It does not
claim that every future Node 24 patch is automatically compatible.
