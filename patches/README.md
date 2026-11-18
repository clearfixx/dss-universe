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

## picomatch 2.3.2, 4.0.4 and 4.0.7 — GHSA-fc5q-39xc-vjpf

The registry currently has no fixed picomatch release for this high-severity
advisory. The three patch files backport only the mixed-wildcard mitigation
from upstream pull request 194 to every version present in the frozen graph.
They do not rename versions or make the raw audit finding disappear.

The guard detects the vulnerable single-branch repeated-extglob shape that
mixes top-level `?` and `*` wildcards. It rejects that unsafe optimization path
while preserving ordinary wildcard, bracket and nested-extglob behavior. This
is a narrow ReDoS mitigation, not a general promise that arbitrary hostile
glob expressions are cheap.

Verification is fail-closed:

- every patch file has an approved SHA-256 digest;
- every installed `lib/parse.js` must match its reviewed post-patch digest;
- the installed version set must remain exactly 2.3.2, 4.0.4 and 4.0.7;
- `scripts/picomatch-patch.test.mjs` executes each installed copy in a bounded
  child process and also checks normal matching behavior;
- only the exact advisory, package, severity and reviewed version set can be
  reported as an owner-approved exception; every other high or critical
  advisory remains blocking.

Maintenance:

1. Track the advisory and upstream pull request until a fixed release exists.
2. Upgrade the owning dependency graph to fixed versions when available.
3. Remove all three patchedDependencies entries and patch files only after the
   upstream release passes frozen install, patch regressions and the full gate.
4. Remove the exact audit exception at the same time; do not leave a stale
   exception for a changed version or advisory.

Picomatch remains MIT; the patches do not alter its license.
