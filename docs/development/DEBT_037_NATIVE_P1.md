# DEBT-037 P1 — Native capability foundation

Status: owner-authorized implementation in progress; no runtime activation.
Base: accepted design PR112, main6eba412. See the
[delivery boundary](DEBT_037_IMPLEMENTATION_PLAN.md).

## Toolchain fixed before installation

- Node24.18.0, matching the repository pin.
- node-gyp13.1.0, exact development dependency of @dss/storage. Its published
  engines include Node^24.15.0;24.18.0 is supported.
- Python3.12.14: existing bundled local runtime; CI will select this version.
- Local Visual Studio2022 Community/MSVC installation17.14.37806.7 already exists.
  POSIX CI uses the runner's compiler and records its actual version.
- Standard Node-API C interface, version8; no node-addon-api wrapper dependency.
  Headers are obtained for the exact pinned Node version by node-gyp.
- C++20, matching the pinned Node24 build configuration; warnings remain errors.

The [Node-API contract](https://nodejs.org/download/release/v24.18.0/docs/api/n-api.html)
and [node-gyp toolchain requirements](https://github.com/nodejs/node-gyp)
are the primary build references. No Python/.NET application runtime is proposed.
Build outputs and downloaded headers are generated artifacts, never authored
helper sources inside node_modules caches. No compiler installation is automatic.

## P1 scope and admission limits

Keep the prototype outside the public portable storage export. Prove loading,
typed opaque root/file objects, root-relative single-component file opening,
metadata inspection, explicit close and asynchronous-resource cleanup. Never
return raw descriptor integers, HANDLE values or private absolute paths to JS.
Opening and inspection must execute off the event loop; handle lifetime must
survive an in-flight operation while logical close rejects new operations.

P1 is not complete physical containment: whole ancestor/root admission, effective
ACL policy, mount crossings, publication, identity-bound cleanup, snapshotting
and scanner/Sharp integration remain separate stages. A P1 root handle must not
be advertised as authorization to use an arbitrary configured directory in the
production application. API and Worker retain their current routes in this stage.

Tests must exercise actual OS objects, forged/wrong/closed capabilities, rejected
links/nonregular objects, in-flight close ordering and handle cleanup. Platform
CI must build and run on Windows/Linux/macOS, recording actual architecture and
toolchain versions rather than claiming untested filesystem/CPU support. Full
quality gate and explicit packet acceptance remain required.

## Local implementation evidence in progress

The first Windows compile rejected a duplicate NOMINMAX definition under strict
warnings. Guarding the platform macros and matching Node24's C++20 configuration
fixed the build without relaxing warning policy. Header/lib downloads were for
Node24.18.0 from nodejs.org and node-gyp retrieved its published SHASUMS256 file.
An upstream Windows discovery path emits DEP0190; the project build launcher
itself uses structured arguments with shell=false. No warning suppression or
new security exception was added.

The first real-OS test run passed11/12 and exposed an uncontrolled V8 TypeError
for null capability input. Early primitive/null validation fixed that defect;
the same assertions then passed12/12. Separate sandbox runs could not create
hardlinks/junctions or rename fixtures, so those denials are not evidence of a
native resource leak. Red/green reports are retained in system temp. Later test
additions, platform CI and the final full gate still require verification.

API/Worker operations remain unchanged. Root opening here rejects a linked final
component but does not verify every ancestor or metadata policy. POSIX nonregular
validation follows a nonblocking open; it is not a claim that opening arbitrary
device nodes is side-effect free. Production source admission remains a later
proof obligation, not a promise hidden inside this prototype.

Current Windows candidate: native build succeeds with warnings-as-errors;
13/13 real-resource tests pass without skips. The suite now includes directory
rejection and a POSIX-only FIFO assertion within the corresponding test; the
FIFO behavior still needs Linux/macOS CI evidence. POSIX environment-teardown
checks compare actual device/inode descriptor identities before/during/after
Worker termination; Windows uses actual rename-sharing barriers.

Full gate policy regressions pass5/5 and require native:verify before coverage.
The new CI workflow builds/tests on all three OS families. Final CI/full-gate
results are pending; this paragraph is not packet acceptance.

Dependency audit currently reports0 high/critical,3 low and18 moderate findings.
None of the advisory paths include the new node-gyp graph. These existing
nonblocking findings are not resolved or waived by P1 and remain relevant to
the stack/security audit. The approved braces patch regression still passes.
