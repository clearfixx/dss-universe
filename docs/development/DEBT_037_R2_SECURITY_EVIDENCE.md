# DEBT-037 R2 — Captured-object security observations

Baseline: accepted R1, main `c8e5190`. The owner separately approved this inactive
native implementation. It neither activates API/Worker storage nor repairs ACLs,
changes existing data, evaluates effective access or closes DEBT-037/D7.

## Private contract

`captureSecurityChain(absoluteRoot)` captures the complete directory chain with
the existing no-follow traversal. Windows requests READ_CONTROL on this separate
capture; ordinary R1 capture keeps its previous access mask. Only a capability
created with security intent can be passed to `inspectSecurityChain`.

The observation returns kind `security-evidence`, `admitted: false`,
`effectiveAccessEvaluated: false`, and one bounded record per captured object:

- nullable ownerMatchesProcess and ownerIsSystem comparisons;
- nullable POSIX groupWrite/otherWrite/sticky mode flags;
- ACL state, format, shape, nullable entry count, numeric OS diagnostic code,
  nullable unknownEntryTypes and inheritanceObserved flags;
- a separate defaultAcl observation only on Linux.

No path, raw OS identity, descriptor, SID, qualifier or ACL bytes cross the bridge.
The current process comparison is not a trusted-owner allowlist. Observations are
fresh per call but are not a transactionally consistent snapshot of concurrent
owner/mode/ACL changes. They never grant an admitted-root capability.

## Platform semantics

Windows uses GetSecurityInfo on the held handle and frees its descriptor with
LocalFree. Process-token comparison uses a separately closed token. A null or
absent DACL is `verified-absent`, with an explicit shape: it is not a safe policy.
An empty DACL is `present`, `empty-dacl`, zero entries. Unknown ACE types are
flagged, not interpreted as ordinary allow/deny entries. No AccessCheck, privilege
enablement, impersonation or historical-handle revocation is implemented.

Linux reads access/default xattrs through fgetxattr on held descriptors. Bounded
version-2 ACL payloads receive structural checks; their entries are not exported.
ENODATA remains `unavailable`, because the generic syscall contract also permits
that error for inaccessible attributes. ENOTSUP remains `unsupported`. A failed
size/read pair is not retried or converted into verified absence. Mode group bits
alone do not establish effective group access when an ACL mask exists.

Darwin reads a copied extended ACL through acl_get_fd_np, validates it, enumerates
it with Darwin's entry convention and frees it on every exit. Only successful
validated empty enumeration can report `verified-absent`; NULL/ENOENT is
`unavailable`. Unsupported errors remain distinct. Extended ACL inheritance is
observed within that ACL, without inventing a separate POSIX default ACL.

## Verification and synthetic fixtures

The mandatory native runner now contains the original 20 P1/R1 regressions and
eight R2 tests: bounded projection, intent/type/close guards, malformed/linked
chains, real ACL controls, fresh mode observations, ambiguous absence semantics,
fixture opt-in refusal and repeated-read/Worker teardown lifecycle.

Windows ACL controls capture a fresh directory before applying a null DACL,
empty DACL or two explicit ACEs. The guard requires an owned ordinary directory
in a newly generated system-temp arena and explicit opt-in. Linux sets actual
access/default xattrs with five entries. Darwin adds a real extended deny ACE
using its system utility. These are retained synthetic fixtures; deployment
uploads, account configuration and application data are never mutated.

Local Windows build succeeded; all 28 native tests passed without skips on
2026-11-06. Logs: `node_modules/.cache/debt037-r2-native-first.log` (initial build
and previous 20 tests) and `node_modules/.cache/debt037-r2-tests-network.log`
(28 tests). The preceding test command could not start because sandbox Corepack
DNS failed; its separate log is retained, not counted as a test run.

Three-platform CI and the final full quality gate are pending. This document is
not acceptance evidence until those results are recorded on the reviewed head.

## Remaining physical-containment work

Effective rights, trusted owner policy, mount qualification, mutation/publication
safety, API/Worker integration and joint activation remain separate. In
particular, prior Windows historical-handle counterexamples are not solved by
reading ACLs. R2 supplies observations for a future admission policy only.

## Primary references

- [Windows GetSecurityInfo](https://learn.microsoft.com/windows/win32/api/aclapi/nf-aclapi-getsecurityinfo)
- [Linux getxattr](https://man7.org/linux/man-pages/man2/getxattr.2.html)
- [Linux ACL semantics](https://man7.org/linux/man-pages/man5/acl.5.html)
- [Darwin descriptor ACL retrieval](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/acl_get_file.3.html)
- [Darwin ACL entry enumeration](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/acl_get_entry.3.html)
