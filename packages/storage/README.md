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
