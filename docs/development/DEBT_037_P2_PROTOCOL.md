# DEBT-037 — Candidate physical-operation protocol

Status: concrete proposal, not runtime authorization or activation. Baseline:
accepted main6cdb670, including the [P2 requirements and cleanup evidence](DEBT_037_P2_DESIGN.md).
The different-OS-user writer threat model remains unchanged.

## Infrastructure boundary and lifecycle

Keep portable key functions unchanged. A separate storage infrastructure entry
point owns native resources, root admission, private staging and coordination.
Media business ports, job payloads and API responses never contain native handles,
private paths or OS security descriptors. Export technical capabilities by name.

Bootstrap returns an opaque admitted-root capability only after admitting every
ancestor, the uploads root and a private same-filesystem control/staging root.
Initialization failure releases all acquired resources. Logical close rejects
new work; in-flight operations retain their resources until completion. Unsafe
configuration fails admission before payload IO, without permission repair.

Opening an object is not admission. Bind each component without following links,
inspect its actual identity/type/security metadata and retain the resources
needed to prevent relocation. Reject unknown or unsupported metadata semantics.
P1's root capability is not implicitly promoted to an admitted production root.

## Coordination proposal: physical parent, 256 private stripes

The existing key policy preserves case and Unicode. Hashing the text key cannot
by itself establish coordination for filesystem aliases. Instead, derive the
stripe from the admitted root's identity and the opened destination parent's
identity. All leaf mutations in the same physical directory serialize, including
different spellings of the same leaf. This is broader than a per-text-key lock;
its throughput cost must be measured before selection.

Candidate mapping: SHA256 over UTF8 `DSS-STORAGE-PARENT-COORD-v1` plus NUL,
one platform byte (Linux1, Windows2, Darwin3), then root identity and parent
identity, each prefixed by its unsigned32-bit little-endian byte length. Use the
first digest byte as stripe0..255. Windows identity is the24-byte little-endian
volume serial followed by the native128-bit file ID; Linux candidate encoding
is unsigned64-bit device and inode fields. Darwin encoding is not selected yet.
No locale/case-folding or string path is used as object identity. Keep the parent
capability alive throughout the operation; do not use a stale inode number alone.

Linux identity includes the actual filesystem/device and inode; mount admission
is checked separately. Windows uses volume serial plus the128-bit file ID from
the opened object. Darwin encoding and admission remain a platform proof gate.
Unsupported identity/mount information is an admission failure, not a fallback.

Use256 stable service-private coordination objects per admitted root. Candidate
primitives are independently opened flock descriptions on Linux and exclusive
LockFileEx regions/handles on Windows. Their inter-thread, cross-process, close,
crash and inheritance behavior requires real binding tests. Do not infer Darwin
semantics from the Linux helper. Never unlink/recreate an active coordination
object. Fixed striping bounds namespace growth; collisions affect concurrency,
not correctness. All processes must use the same protocol/version/control root.

Operations requiring several parents derive stripes first, deduplicate and
acquire them in ascending order. Never hold an OS lock across a JavaScript
callback/await boundary: the protected native mutation is one worker operation.
Preparing output bytes, scanning and transforming stay outside namespace locks.
No new business lease, whole-job exclusivity, retry loop or timeout is proposed.

## Operation sequences

| Operation               | Candidate sequence                                                                                                                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create parent           | Admit its existing parent; acquire that parent's stripe; create one component with explicit service ownership/security; on collision reopen and admit the actual object; never adopt an attacker-owned prefix                                                                 |
| Save                    | Validate the complete logical key plan; create/write an exclusive private staging object; admit destination parents; acquire destination-parent coordination; revalidate destination policy; publish the actual staged object; release coordination; return unchanged key/URL |
| Read                    | Admit the parent and leaf object without following links; coordinate leaf admission against DSS mutation; reject nonregular/multiply linked/unsafe-write objects; retain the captured regular object for reading, not a mutable public pathname                               |
| Delete current key      | Admit parent; acquire its stripe; inspect the current directory entry without following links; remove according to explicitly tested current-key semantics; preserve the existing missing-file no-op; never recursively delete a directory                                    |
| Cleanup captured object | Retain the captured object/parent identity; acquire the parent's stripe; reopen/revalidate current entry; remove only a matching captured object; a missing/replaced entry is skipped; dispose private unpublished objects through their owned capability                     |

Windows source-handle rename/disposition and POSIX renameat/unlinkat need separate
binding implementations. POSIX identity check plus unlink is safe against other
DSS writers only while they all participate in coordination. Protection against
the local attacker still depends on admitted namespace security, not advisory
locks. The accepted helper does not prove that combined mechanism.

Published files must not be mutated in place by a cooperating DSS writer; use
private preparation and replacement. Capture exact produced size/hash from the
owned object. Do not claim atomicity across variants and DB commit or power-loss
durability. Preserve current upload limits, formats, Media audit/DB ordering and
StorageProvider save/read/delete success contracts. Failure mapping must not
expose absolute paths, OS identities, ACLs or credentials through presentation.

## Admission and preexisting-capability obligations

For POSIX directories, ownership/mode/sticky checks are only part of the policy:
ACLs, every ancestor and mount transitions also need admission. For Windows,
inspect actual object owner/DACL and effective destructive/metadata rights,
including inherited grants and service token groups/privileges. Directory
sharing flags do not substitute for security admission. Do not automatically
modify existing ACLs or chmod/chown uploads.

Tests must cover attacker handles opened before admission, both under the
intended policy and across a later permission change. A currently restrictive
ACL does not by itself prove that historical handles have lost their rights.
No claim is made that enumerating a DACL revokes such capabilities. If the
selected primitive cannot satisfy that case, record the counterexample and
review a stronger mechanism or controlled provisioning boundary; do not silently
exclude the scenario or claim it fixed. Existing-data adoption/permission repair
remains separately reviewed work.

## Rollout and acceptance

Do not activate an API-only protocol while Worker still uses pathname writes
and cleanup. P2 can deliver an explicitly inactive technical implementation;
P3 must connect scanner/snapshot/Sharp and all Worker namespace mutations before
the joint route is enabled. An unsafe/unsupported native configuration must
never select the old adapter as a permissive fallback. Existing development OS
support cannot be silently removed to make the matrix pass.

Before implementation selection, prove alias coordination, sorted multi-parent
acquisition, collisions, independent-process locks, crashes and resource cleanup.
Then prove admission/publication/conditional cleanup with real outside sentinels,
different identities and preexisting handles on the supported filesystems.
Benchmark same-parent contention and unrelated-parent throughput. Windows
distinct-user provisioning and Darwin policy still require concrete review;
no host users or permissions are changed by this document.

This protocol proposes physical-parent coordination and256 stripes for review;
it does not claim those choices accepted, implemented or security-certified.
Full quality/CI and owner packet acceptance remain required. DEBT-037 stays open.

## Windows identity checkpoint

tools/agent-helpers/debt037/parent-identity.ps1 opened real synthetic directories
on Windows10.0.26300 and queried FILE_ID_INFO through owned metadata handles.
Two case variants resolved to equal24-byte identities and the candidate mapping
returned one stripe. Handles are disposed by the interop wrapper; fixtures are
retained in the isolated temporary arena. No uploads, users or ACLs were changed.

The first invocation stopped before comparison on an ambiguous PowerShell
SequenceEqual overload. Explicit ordinal comparison of hex-encoded identity
bytes fixed harness dispatch; the physical-object comparison was retained.
Final evidence is local, outside tracked source. This checkpoint does not prove
8.3/Unicode aliases, case-sensitive directory behavior, stable lock objects,
contention, hostile-user rights, admission or cross-platform equivalence.

## Primary references

- [Windows FILE_ID_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info) defines the volume/file identity pair used to compare opened objects.
- [Windows LockFileEx](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-lockfileex) defines exclusive ranges, waiting and handle interactions; binding behavior still needs tests.
- [Linux flock](https://man7.org/linux/man-pages/man2/flock.2.html) distinguishes independent opens from inherited/duplicated descriptions and documents advisory scope.
- [Linux statx](https://man7.org/linux/man-pages/man2/statx.2.html) exposes filesystem/object fields and mount identity with explicit availability masks.
