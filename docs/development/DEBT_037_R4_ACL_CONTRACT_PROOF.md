# DEBT-037 R4 — Disposable POSIX ACL contract proof

Status: owner-approved proof-only implementation; measured CI results pending.
Baseline: accepted PR134 / main `48b51ae`. The owner approved the separate C++
probe and guarded hosted POSIX sudo harness on2026-11-07 local time. This does
not implement admission policy, repair uploads ACLs, change application data,
activate API/Worker or close DEBT-037/D7.

## Why this proof is needed

R2 deliberately preserves Linux ENODATA and Darwin NULL/ENOENT as unavailable
evidence. R3 compares native identity/topology observations without granting
an admitted root. The accepted admission design still needs an absence proof
or a sufficient, qualified conservative rights bound. Linux POSIX ACL_MASK
reasoning cannot simply be copied to Darwin extended ACLs.

Reviewed Apple source at `71bbe350ab79eef58113991d817ccc6165061a64`
(Libc-1752.100.10) separates stat and FILESEC_ACL property retrieval. Its stat
wrapper unsets that property both for NOACL and an insufficient extended record.
This is version-specific implementation evidence, not a supported inference
that every unset property means no ACL. The proof uses public query interfaces;
FILESEC_ACL_RAW/private properties are not consumed.

## Fixture and process boundary

The test-only executable is built by the existing node-gyp/compiler toolchain
on Linux/macOS. Windows keeps its unchanged36 native tests; this POSIX-specific
proof neither removes Windows support nor substitutes a Windows ACL policy.
No npm/OS dependency or compiler is installed by the helper.

The launcher and native program require explicit opt-in on GitHub-hosted POSIX
CI. The launcher must be an ordinary user; sudo is noninteractive and root is
orchestration only. The native program checks the original sudo identity against
the existing runner account and resolves the existing nobody account. No user
account, password, group, mount or host service is created or modified.

The harness creates one random fresh arena under the canonical root-owned
system temp directory and changes ownership/mode only on that new arena.
All fixture directory/ACL operations run in a separate runner process. All
attack attempts run in a separate nobody process, with supplementary groups
cleared, real/effective UID/GID checked and inability to regain root verified.
Every child closes unrelated non-stdio descriptors before action. Pipe
ready/go barriers coordinate each attempt; there is no sleep or timeout change.
Descriptor-limit guarding bounds this disposable harness, not application IO.

Only synthetic marker files are created. Fixtures are retained for runner
teardown rather than swept recursively. The helper accepts no target path;
production uploads and the developer's machine are never privileged targets.
The local Windows guard must refuse execution before invoking sudo.

## Concrete controls

Common controls: fresh owner-only directory denial, permissive-mode positive
control, explicit empty-ACL request and resulting observations, ordinary
service/attacker identity checks, and a real EBADF descriptor-query negative
control. Empty ACL preservation/normalization is recorded rather than assumed
to establish absence. A missing/omitted attribute never becomes an allow.

Linux adds a five-entry named-user ACL: mask0 denial followed by mask7 positive
control; the named grant remains present. An inherited/default-ACL parent then
creates restrictive0700 and permissive0770 children, comparing their actual
ACL/mode observations with the real attacker's create attempts. This tests a
candidate POSIX rights bound without relabelling an xattr error as absence.

Darwin adds a named allow ACE over restrictive0700 mode, a named deny ACE over
permissive0777 mode, and a directory-inherited allow control. It records the
ACL getter, fstatx result, property query/get results and fgetattrlist returned
security bit/length separately. Complete-buffer checks are not an assertion
that a missing security bit proves absence. Only bounded status, count and
flag facts are returned, not security blobs, qualifiers or raw identities.

Records use rc=-2 and entries/presence=-1 for an unperformed/unavailable lens,
not success. Getter errors retain actual errno; property errors are not silently
replaced with stat success. Result validation rejects unknown output keys.

## Build, evidence and acceptance

The new `dss_acl_contract_proof` native build target is test-only. It is not a
Node addon, public package export or application dependency. The existing
three-platform native matrix still runs R1/R2/R3 tests and coordination controls.
Its POSIX jobs additionally run `tools/agent-helpers/debt037/run-acl-contract-proof.mjs`
and upload bounded JSON evidence, including failures that reach the native probe.
Compile failures remain CI failures even if no JSON artifact could be produced.

Authored helper code stays under tools/agent-helpers/debt037; owned build/CI
configuration stays with its component. Generated JSON is written under
node_modules/.cache and uploaded as acl-contract-Linux/macOS artifacts. It is
evidence, not an authored script in a dependency cache. Runtime kernel version
and reviewed source pins remain separate; source publication is not proof of
the library actually installed on a runner.

Initial local Windows native build/tests pass36/36. The proof launcher rejects
local execution as required. No elevated proof was run on the developer PC.
Actual POSIX compile/actor results, final exact-head CI/full gate and owner
acceptance remain pending at this checkpoint. No predetermined absence result,
skipped positive control or permissive fallback can satisfy acceptance.

Initial head37c1faf: Linux actually passed7 actor controls and the EBADF control
(run42307330287/job128199867522). macOS failed to compile because fgetattrlist
was not declared without unistd.h (job128199867542). The artifact uploader also
excluded the hidden .cache directory. The follow-up adds the public header and
include-hidden-files only for the narrow validated proof JSON glob. Original
Linux records remain in CI logs; no initial JSON artifact is claimed. No proof
assertion or platform is removed by these corrections.

Header-corrected head9128aac compiled on macOS but failed before fixture work.
Diagnostic headda946cf measured check8: groupCount1, onlyActorGroup=true,
rootGroup=false (run42314507300/job128223737371). A zero-count assertion had
incorrectly treated Darwin's primary-group entry as a supplementary leak.
The correction still clears groups and validates every returned GID: Linux
requires zero entries; Darwin allows at most the exact actor primary GID,
with no root/unrelated group. Successful readiness records retain those bounded
facts for every actor. UID/GID matching and inability to regain root remain.

## Reviewed sources

- [Apple ACL getter](https://github.com/apple-oss-distributions/Libc/blob/71bbe350ab79eef58113991d817ccc6165061a64/posix1e/acl_file.c)
- [Apple property handling](https://github.com/apple-oss-distributions/Libc/blob/71bbe350ab79eef58113991d817ccc6165061a64/gen/filesec.c)
- [Apple stat wrapper](https://github.com/apple-oss-distributions/Libc/blob/71bbe350ab79eef58113991d817ccc6165061a64/sys/statx_np.c)
- [Linux ACL source snapshot](https://github.com/torvalds/linux/blob/a91337fb5e8e0127c8b5be87be9f3027f95b48bc/fs/posix_acl.c)
- [Linux ACL mode/mask contract](https://man7.org/linux/man-pages/man5/acl.5.html)

The new code uses public system APIs; upstream implementation text is not
copied. This proof does not select a production filesystem allowlist, complete
effective-rights evaluator, root/mount admission or physical mutation mechanism.
