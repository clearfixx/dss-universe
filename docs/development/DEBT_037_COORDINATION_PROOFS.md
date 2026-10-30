# DEBT-037 — Cross-process coordination proofs

Status: isolated primitive characterization, not runtime activation. Baseline:
accepted main906f0d3 and the [candidate protocol](DEBT_037_P2_PROTOCOL.md).

## Scope and ownership

The maintained helper tools/agent-helpers/debt037/coordination-proof.py uses only
Python standard-library calls and Windows ctypes bindings. It does not import
application services or change API/Worker storage routes. All fixtures live in a
fresh temporary arena and remain available for inspection. No recursive deletion,
host users, ACL repair, uploads access, network or new dependency is involved.

The Node launcher reads the interpreter chosen by the preceding native build
from generated node-gyp config.gypi. It invokes that interpreter with structured
arguments and propagates failures. Missing configuration fails with a native-build
prerequisite rather than installing/resolving another Python or opening a Store
alias. Generated toolchain metadata is not authored helper source in a cache.

The full quality plan requires storage:coordination:verify after native:verify
and before coverage. A policy regression protects that ordering. The existing
three-platform native CI job runs the same command after its real build/tests;
no timeout increase, retry or platform skip is added.

## Scenarios and evidence interpretation

The fixture creates257 real parent directories and derives256 candidate stripes
from their actual object identities. This guarantees a collision without choosing
synthetic hashes. It selects a different occupied stripe as the unrelated control.
Every child independently reopens the three selected parents and recomputes their
stripes. Windows also checks the same physical directory through a case alias.

| Scenario                         | Required observation                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Independent opens in one process | A second independently opened lock resource cannot acquire the held stripe                                  |
| Cross-process collision          | The child recomputes equal stripes for different actual parents; the held stripe is unavailable             |
| Unrelated stripe                 | Another stripe is acquired and released while the first remains held                                        |
| Release handoff                  | Pipe ordering confirms the first owner released before the child acquires                                   |
| Ordered pair                     | Reversed/duplicate inputs become a sorted unique pair; the child holds both and parent probes fail for both |
| Abrupt exit                      | os.\_exit bypasses Python cleanup; kernel resource teardown makes both stripes available                    |
| Parent input EOF                 | Child exits with the expected code and releases held stripes without publication or Python cleanup          |
| Killed child                     | Only the controller's captured child process is killed; after terminal wait, its stripe is available        |

Pipe commands, acknowledgements and nonblocking acquisitions establish ordering.
There are no sleeps or retries. A30-second child watchdog and bounded terminal
waits fail a broken fixture; they do not synchronize successful operations or
change application timeouts. Child diagnostics are retained on failure. Python
optimization is rejected before fixtures, including when inherited through env.

These observations are not a proof of deadlock freedom for every future native
operation, fairness, starvation resistance or production throughput. In particular,
the sorted-pair case does not measure every multi-process contention schedule.
The probe does not qualify filesystems, test a different attacker identity,
establish root/ACL/mount admission, or exercise a production Node-API lock binding.
Darwin uses an experimental device/inode pair in this probe; its production
encoding and admission policy remain unselected. No API/Worker fallback is added.

## Local checkpoints and retained failures

On Windows10.0.26300/Python3.12.14, the actual interprocess and termination
scenarios passed. The initial AppContainer attempt was denied while writing its
new fixture nonce, before any lock scenario; that denial is not evidence of
either lock failure or containment. The real-host run used only its own temp arena.

Linux ran with the already-cached image
sha256:5d9624a93634d1c5e595619cc57b1d330758120d1baf445fa97300c0c1fc3c0a,
user5050:5050, cap-drop ALL, no-new-privileges, no network, read-only rootfs and
only the helper bind-mounted read-only. /tmp was a private16MiB noexec/nosuid/nodev
tmpfs. Direct execution of /usr/bin/python3 returned operation-not-permitted in
this restricted configuration. Copying the existing interpreter into a separate
private32MiB exec/nosuid/nodev runtime tmpfs allowed the same scenarios to pass
without adding capabilities or installing packages. This is fixture runtime
preparation, not a change to a host/application interpreter or image.

The observed Linux runtime was Python3.12.12 on the WSL2 kernel. The probe's
same-service coordination is separate from the accepted different-OS-user threat
model; hostile-user namespace protections still need their own evidence. macOS
results, final CI and full local gate remain pending at this checkpoint.

## Completion requirements

Run the exact final source on Windows/Linux/macOS, inspect each scenario's JSON,
and record platform/toolchain provenance. Complete full quality, migrated DB
regressions, generated-output checks, build and no-retry Web smoke. Keep any
failure evidence. Request owner packet acceptance after terminal CI/full-gate
results; this packet cannot independently close P2, DEBT-037 or D7.
