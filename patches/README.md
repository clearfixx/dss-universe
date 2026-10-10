# Local dependency security patches

This directory owns reviewable third-party diffs, not application modules.
Never edit installed node_modules or change upstream package versions to make
an audit appear clean. pnpm applies registered patches during frozen install.

## braces 3.0.3 — GHSA-vfj7-8cjw-p6xm

`braces@3.0.3.patch` is a local mitigation, not an upstream release or an
accepted security exception. The package retains version 3.0.3 and the audit
continues to report its high advisory. Keep the security job red until the
release policy is satisfied; do not add ignored advisories.

Design:

- parser rejects a new brace/parenthesis container when the parser stack
  reaches 128 entries (root included, at most 127 nested containers);
- compile, expand and stringify validate child-node depth iteratively before
  entering their recursive walkers; root depth is zero, maximum AST depth 128;
- external cyclic child graphs hit the same bound; ordinary AST parent/prev
  references are not traversed;
- over-limit input throws a deterministic RangeError instead of silently
  truncating patterns or returning partial matches;
- callers cannot raise this security bound through options.

This deliberately rejects unusually deep patterns. It does not solve unrelated
expansion-cardinality problems, arbitrary hostile getters, malformed parent
graphs, or every upstream bug. Existing range limits are unchanged. A caller
accepting untrusted patterns must still handle validation errors.

Verification: `pnpm test:dependency-patches`. The tests resolve braces through
Nest GraphQL -> ts-morph -> common -> fast-glob -> micromatch, so they exercise
the installed patched dependency, not an uninstalled work copy. Security CI
runs the tests even when the unchanged dependency audit fails.

Maintenance:

1. Review any upstream fixed release and reproduce these tests against it.
2. Upgrade through the owning parent package where possible.
3. Remove the exact patchedDependencies entry and patch file only after the
   upstream fix passes regression, frozen install and the full quality gate.
4. Regenerate the lockfile and review its integrity/patch hash changes.

The generated patch preserves upstream code style. The newly authored guard
has a DSS Passport identifying this patch as its maintained source artifact.
No third-party license is changed; braces remains MIT.
