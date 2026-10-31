# DEBT-092 — Joi dependency security

## Trigger and scope

The full local gate for PR119 head07eb4e0 failed on2026-10-31 at
`security:check`, blocking GHSA-4528-x5fx-h6hg. The prior exact-head CI audit
passed before this local observation; its result remains historical evidence,
not a reason to waive the newly reported advisory. The failed gate log is
retained as `node_modules/.cache/identity-quality-fff69ad67dfb4f998e3399a79f196f6d.log`.

The [reviewed advisory](https://github.com/advisories/GHSA-4528-x5fx-h6hg)
identifies quadratic splitting in `string().email({ multiple: true })` and
fixes for Joi17.13.9/18.3.1. The
[upstream correction](https://github.com/hapijs/joi/commit/03dc1d9)
changes splitting and adds behavioral/performance cases. The
[18.3.1 release](https://github.com/hapijs/joi/releases/tag/v18.3.1)
is available in npm and requires Node>=20, compatible with the project's Node24.

## Minimal correction

`pnpm why joi --recursive` reports one version, Joi18.2.9, directly owned by
`@dss/api`. Update its range from `^18.2.9` to `^18.3.1` and resolve18.3.1.
No other package version is changed. The package-manager update also rewrote a
Vitest peer edge; that unrelated resolution was restored before the successful
frozen installation. No frontend file, public API, migration, runtime validation
rule, security exception or stack decision is changed.

The direct DSS consumer is `core/config/validation.schema.ts`. This package does
not claim a reachable public exploit in DSS or introduce a new use of the
multiple-email feature. It removes the affected dependency version and verifies
the actual consumer's existing contract rather than copying library tests into
the application.

## Verification checkpoint

- Frozen installation: passed, pnpm11.9.0.
- Existing configuration-schema regressions:6/6; complete schema description,
  defaults and validation policies retained.
- Actual security check: exit0; braces patch verified,14/14 regressions.
- Full local gate, final CI and owner acceptance: pending.

This separate package unblocks security validation of PR119. It does not accept
PR119, close DEBT-037/D7 or authorize storage runtime activation.
