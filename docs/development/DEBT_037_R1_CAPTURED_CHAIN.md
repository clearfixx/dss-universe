# DEBT-037 R1 — Native captured root chain

Baseline: accepted main `18367e1` / runtime-boundary design PR129. Owner separately
approved this inactive native implementation on2026-11-06. It does not authorize
an API/Worker switch, legacy-root adoption, ACL changes or production containment.

## Concrete native contract

The private addon has two new named operations:

- `captureRootChain(absoluteRoot)` returns an opaque captured-chain capability.
- `inspectChain(chain)` reinspects its actual objects and returns only
  `{ kind: 'captured-chain', components: number, admitted: false }`.
- Existing `close` accepts either kind, rejects forged objects and remains
  idempotent. A chain cannot be passed to single-object inspect/openFile; a P1
  root or file cannot be passed to inspectChain. Closed chains reject new work.

The public `@dss/storage` exports remain unchanged. The addon still lives under
`native-probe`, is not imported by either application and is not promoted to an
admitted production root. No raw descriptors, absolute paths, OS identities or
ACLs are returned. Existing P1 operations and their tests remain intact.

## Complete planning before traversal

`root-chain.cc` plans the complete input before opening the anchor. It rejects
relative roots, NUL, dot/traversal components and repeated separators. Anchor-only
paths and one trailing separator are valid. Windows uses a drive-letter anchor,
accepts either separator and rejects UNC/device roots and colon-bearing child
components. These are explicit R1 root-configuration rules, not new Media key
rules or support for arbitrary Windows namespaces. Windows converts and bounds
all component names before anchor IO.

POSIX uses `/` and rejects the implementation-dependent double-leading-slash
form. POSIX root component spelling is preserved, including host-legal colons
and backslashes; portable media-key normalization is not applied to host roots.
Filesystem-specific lookup/length/permission errors still come from the OS.

Tests use realpath only to choose their already-created synthetic fixture arena
(macOS temporary paths may include aliases). The actual capture operation never
calls realpath or follows a caller-provided link to make a test pass.

## Platform resource sequence

POSIX opens `/`, then each directory with openat relative to the retained
predecessor using DIRECTORY/NOFOLLOW/CLOEXEC/NONBLOCK flags and actual fstat type
inspection. Windows opens only the drive anchor by full path, then uses
NtCreateFile RootDirectory-relative single-component directory opens with
OPEN_REPARSE_POINT. Each object is inspected for type/reparse metadata before
retention. No component is reopened using a reconstructed full path.

The resulting native chain owns all component resources, including the anchor.
Partial failure destroys the acquired vector through RAII. Async work copies
shared chain ownership before queuing; logical close prevents new operations
without invalidating an already accepted inspect. Environment finalization
releases the entire chain. No OS lock, JS callback under a lock, new library or
build dependency is introduced.

## Regression evidence and limits

Seven R1 scenarios extend the existing13 native tests, rather than bypassing the
mandatory native runner. They cover opaque/kind isolation, root/trailing-separator
and Unicode spelling, complete-plan errors before a missing prefix, ancestor and
final symlink/junction refusal, missing/non-directory partial failures, queued
inspect across close, forged objects and worker-thread teardown.

POSIX lifecycle checks observe descriptors against actual device/inode metadata.
The teardown test checks the descriptor delta for every captured component,
including the anchor; termination must restore the baseline. Windows checks that
every synthetic captured ancestor resists rename while held and is released
after teardown. It never attempts to rename a system directory. Rejected linked
fixtures are moved only at their own entry; no recursive traversal/deletion of
junctions is performed. Outside sentinel bytes remain unchanged.

First Windows compilation/native verification passed20/20 before the teardown
assertions were strengthened to cover the whole chain. That result is historical
evidence, not final verification of the later assertion changes. Final native
Windows/Linux/macOS, full gate, CI and owner acceptance remain required.

R1 deliberately reports `admitted: false`. Component capture does not prove that
the hierarchy remains connected or cannot be relocated, effective ACL/default
ACL security, mount boundaries, historical-write capability exclusion, private
control admission, publication or conditional deletion. A retained descriptor is
not a substitute for those policies or syscalls. No different-user fixture or
production root is modified in this subpacket. DEBT-037/D7 remain open.

## Retained macOS measurement failure

Initial head `73d0dee` native CI passed20/20 on Linux and Windows, but19/20 on
macOS. Run42212514383/job127874369785 failed the whole-chain teardown test's
pre-teardown census assertion: actual15 versus expected14. Compilation and the
other19 native scenarios passed; no runtime leak or its absence is established
by that mismatch. The failed run is retained, not rerun to obtain a green result.

The old census compared before Worker creation with after capture, combining
Worker initialization and native-resource acquisition. The revised fixture uses
an explicit message barrier before capture. It records counts before Worker,
after Worker-ready and after capture, still requires the exact component-count
delta, and still requires teardown to return to the original pre-Worker baseline.
No sleep, timeout change, platform skip or relaxed descriptor bound is added.
Native implementation is unchanged. New phase observations must establish what
happened; this correction does not presume the cause of the extra descriptor.

Related: [accepted complete runtime boundary](DEBT_037_RUNTIME_BOUNDARY_DESIGN.md),
[parent coordination protocol](DEBT_037_P2_PROTOCOL.md) and
[Windows historical-handle matrix](DEBT_037_RELATIVE_HANDLE_PROOF.md).
