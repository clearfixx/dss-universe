# Storage infrastructure contract

`@dss/storage` owns only portable key validation and lexical uploads-root containment.
API persistence, Worker image processing, and malware scanning consume named exports
from this package; it must not depend on those applications or on Media policy.

Keys are nonempty relative paths. Backslashes become forward slashes. Absolute paths,
drive-relative paths, traversal/dot/empty segments, control characters, Windows device
names, alternate data streams, and trailing dots/spaces are rejected, never repaired.
Percent escapes are literal filename characters, not decoded URLs.

All keys in a processing job must be validated before filesystem or network effects.
The package has no filesystem or network effects itself.

This is **lexical containment**, not symlink/junction isolation. The uploads root and
its directories must be application-controlled; untrusted local filesystem writers
are outside this contract. Physical containment and TOCTOU defenses require a separate
design. This helper does not provide authorization, MIME policy, or malware scanning.

## Experimental native P1

The owner-authorized `native-probe/` proves a minimal Node-API resource bridge.
It is not exported by the package or loaded by API/Worker. Existing key helpers
retain the lexical contract above; the prototype does not establish physical
containment, root/ACL admission, mount policy or a production adapter.

`pnpm --filter @dss/storage native:verify` builds and tests actual OS resources.
The full quality gate now requires this verification. It needs pinned Node24.18.0,
node-gyp13.1.0, an installed compatible Python (local3.12.14; CI3.14.10) and an existing native compiler: Visual Studio2022
C++ tools locally on Windows, or the platform compiler on Linux/macOS. Set PYTHON
to an installed interpreter path when it is not discoverable. No compiler is
installed automatically. node-gyp obtains headers/lib for the pinned Node release;
generated build/cache artifacts are separate from authored source files.

The three-platform CI matrix records actual toolchain/architecture. Native tests
use fresh system-temp fixtures, retained for inspection, and no application data.
POSIX tests also use the standard mkfifo utility to verify nonblocking rejection.
See [P1 scope and evidence](../../docs/development/DEBT_037_NATIVE_P1.md).

## Experimental native R1

The private addon additionally exposes named `captureRootChain` and `inspectChain`
operations, using existing `close`. A captured chain retains the anchor and every
directory opened relative to its predecessor. It rejects ancestor/final links and
reports structural facts with `admitted: false`; it cannot be used as a P1 root or
file capability. The public package exports and API/Worker routes are unchanged.

Whole-chain capture is not ACL/effective-rights admission, mount qualification,
relocation prevention or mutation safety. See
[R1 scope and evidence](../../docs/development/DEBT_037_R1_CAPTURED_CHAIN.md).

## Experimental native R2

The private `captureSecurityChain` operation separately requests security-readable
resources; `inspectSecurityChain` observes owner comparisons, POSIX mode flags and
bounded ACL facts from those held resources. R1 capabilities cannot be promoted
to this intent. Windows distinguishes null and empty DACLs; POSIX preserves
unavailable/unsupported evidence instead of interpreting a query error as absence.
The observations always report `admitted: false` and
`effectiveAccessEvaluated: false`. They expose neither raw identities nor ACLs.

The mandatory native runner includes real synthetic ACL controls. Windows fixture
setup uses PowerShell 7 and existing .NET/Win32 APIs; Linux uses Python's standard
library xattr support; macOS uses the system chmod ACL utility. These helpers only
modify newly created opt-in test directories. No application storage is changed.
See [R2 scope and evidence](../../docs/development/DEBT_037_R2_SECURITY_EVIDENCE.md).

## Experimental native R3

Private `inspectTopologyChain` and `compareTopologyChains` add actual retained-
object identity, filesystem and mount observations without returning native IDs.
Unavailable/unsupported identity stays distinct from equality; filesystem or
volume equality is never silently promoted to mount equality. Observations
always report admitted false; no filesystem allowlist or application activation
is introduced. Linux uses descriptor-bound statx mount observations. Windows
and Darwin retain explicit unsupported mount-point identity while observing
their actual native file/volume facts. See
[R3 scope and limits](../../docs/development/DEBT_037_R3_TOPOLOGY_EVIDENCE.md).
