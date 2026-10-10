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
