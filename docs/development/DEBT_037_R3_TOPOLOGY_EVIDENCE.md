# DEBT-037 R3 — Native identity and topology observations

Baseline: accepted admission design PR132 / main `d43ec37`. The owner approved
this separate inactive runtime packet. R1/R2 behavior and the public package
exports are unchanged. API/Worker, application data, deployment ACLs, dependencies
and frontend are not changed. No complete admitted-root capability is returned.

## Private operations

- `inspectTopologyChain(chain)` accepts an existing R1 or R2 chain and observes
  each retained object without reopening its pathname. It returns kind
  `topology-evidence`, admitted false and filesystemQualified false.
- `compareTopologyChains(left, right)` observes both complete retained chains
  and returns nullable sameObject/sameFilesystem/sameMount for their final
  objects, with kind `topology-comparison` and admitted false.
- Existing logical close rejects new operations. Accepted asynchronous work
  pins both chains. Environment finalization releases unclosed resources.

Each component has separate object/filesystem/mount observations: state
present/unavailable/unsupported, a bounded mechanism kind and numeric OS error.
Private native vectors retain IDs only for the observation/comparison. No raw
device/inode, fsid, file ID, volume serial, mount ID, descriptor or path is
serialized to Node. Equality is reported only when both observations are
present with the same mechanism kind and nonempty private identities. Unknown
or incompatible observations produce null, never a synthetic zero identity.

Component output also includes a bounded filesystem family, volumeFlags
(state/error and nullable readOnly/local/persistentAcl) and nullable relations
to its previous chain object. Anchor relations are null. Null local or
persistentAcl means that lens is not supplied on that platform, not false.

These are fresh observations, not an atomic metadata snapshot, persistent
deployment identity, cross-host identity or proof that an object remains under
its configured path. Retained handles prevent premature resource reuse, not
every namespace relocation or mutation.

## Platform contract

Windows reads FileIdInfo through GetFileInformationByHandleEx and volume
properties through GetVolumeInformationByHandleW. Internal object identity is
volume serial plus128-bit file ID; volume comparison uses the observed serial.
This mechanism follows the native open-handle comparison contract, not a
promise about cloned volumes or persistent IDs. NTFS/ReFS/other are observation
labels, not an allowlist. Persistent ACL support and read-only flags are not
effective-rights checks. Local/remote status is not guessed. Mount-point identity
is explicitly unsupported: a volume serial is not relabelled as a mount ID.

Linux reads device/inode with fstat and device/fsid/family with fstatfs.
Read-only status comes from fstatvfs. Descriptor-bound statx requests a unique
mount ID when the build headers expose it and checks the returned mask. If not
available, it deliberately queries the legacy mount ID and reports that distinct
kind. Legacy IDs retain their native lifetime/scope limitations. Missing mask
bits, unsupported syscalls and other failures remain explicit. Device equality
does not imply mount equality. No pathname or proc-text fallback is used to
invent an ID. Local/remote and persistent-ACL flags are not guessed.

Darwin uses fstat device/inode and fstatfs device/fsid, native family and
read-only/local flags. It does not publish mount names or confuse fsid with a
qualified unique mount ID: mount identity remains explicitly unsupported.
Darwin identity bytes stay native-private; no coordination protocol encoding
or complete APFS security qualification is selected here.

Unsupported mount identity on Windows/Darwin is a recorded limitation, not a
permissive implementation of mount admission. All three OS families remain
supported by the observation runner; complete admission still has that gate.

## Real verification controls

Eight R3 tests extend the mandatory native suite from28 to36:

1. Exact bounded keys, explicit field states and no native bytes/paths.
2. Same object through independent captures versus different sibling objects.
3. Real volume flags, Linux mount identity positive control in CI and explicit
   unsupported mount equality on Windows/Darwin.
4. Forged/proxy/wrong-kind/closed objects, arity and both comparison inputs;
   R2 security-capture intent is preserved.
5. In-flight observation and two-chain comparison across idempotent close.
6. POSIX retained object after rename without reopening the old path; Windows
   sharing denial and successful rename only after close.
7. Real topology comparison: Linux creates a fresh fixture on the runner's
   existing /dev/shm tmpfs and compares it with the system-temp fixture. The
   test requires distinct devices and observes distinct mounts, without
   creating or changing a host mount. Other OSes compare the anchor and leaf.
8. Repeated observations and Worker termination, checking actual retained leaf
   descriptors or Windows sharing release without process exit.

Only new synthetic fixtures are created; no deployment root or user account is
modified. The first Windows build succeeded, but the old named-export assertion
had its two new names in the wrong alphabetical order:35/36. The corrected
explicit list retains the same exact membership; native36/36 then passed.
Both logs remain at node_modules/.cache/debt037-r3-native-first.log and
debt037-r3-native-export-order.log. No implementation failure is hidden by a
retry or weakened assertion. Final full gate, three-platform CI and packet
acceptance are still pending at this implementation checkpoint.

## Remaining gates and references

The accepted [admission design](DEBT_037_ADMISSION_POLICY_DESIGN.md) still needs
owner/effective-rights policy, supported ACL-absence/bounding evidence, qualified
mount behavior and operation-specific publication/removal proofs. R3 does not
close DEBT-037/D7 or authorize API/Worker activation or historical data adoption.

- [Windows FILE_ID_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info)
- [Windows handle-bound volume properties](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumeinformationbyhandlew)
- [Linux statx](https://man7.org/linux/man-pages/man2/statx.2.html)
- [Linux fstatfs](https://man7.org/linux/man-pages/man2/statfs.2.html)
- [Darwin fstatfs](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/statfs.2.html)
