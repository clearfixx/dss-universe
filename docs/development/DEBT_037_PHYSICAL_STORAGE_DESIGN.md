# DEBT-037 — Physical local storage design and evidence

Date: 2026-10-29. Source baseline: accepted main289b24c.
Status: WORKING DESIGN; inventory and Windows/Linux primitive characterization.
No physical runtime correction, migration or final mechanism acceptance is claimed.

## Required outcome

The owner explicitly requires physical containment before Phase11, including
hostile local symlink/junction substitution. A trusted-writers-only assumption
is not an accepted disposition. Portable key validation remains necessary but
does not authorize any filesystem operation by itself.

Untrusted namespace modification must not redirect DSS reads, writes, deletion,
image processing or malware streaming to an unauthorized object. Define and
test root-object identity, not just a lexical prefix. Directory relocation,
hard links, root replacement, devices and mount/reparse behavior need explicit
coverage; do not silently exclude them from the selected mechanism's claim.
Process/kernel compromise cannot be solved by a path helper. The implementation
must state the actual attacker permissions and supported local filesystems.

Owner clarification2026-10-29: the local attacker is a different OS user with
write access to uploads, not another process using the DSS service UID/token.
This does not waive physical containment or assume uploads has only trusted
writers. A dedicated service identity and enforceable private control/staging
permissions are part of the candidate boundary. Root/admin-equivalent compromise
and theft of the service identity are not certified by these probes.

## Current IO inventory

| Owner/adapter                          | Actual operations                                                                                                  | Current gap                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| API Core LocalStorageProvider          | save resolves key, recursively mkdirs parent, writeFile; read uses readFile; delete uses rm                        | Each operation resolves a string path again; parent substitution can redirect IO.               |
| Media binary upload/delivery/retention | StorageService save/read/delete using temporary, original and variant keys; compensation deletes temporary upload  | Keep these semantic callers independent of OS handles and physical layout.                      |
| Worker LocalMediaFileProcessor         | access, recursive mkdir, copyFile, Sharp path input/toFile output, readFile/stat for metadata/checksums, source rm | Input/output/metadata are separate path opens, not one bound object.                            |
| Worker ClamAvMediaMalwareScanner       | createReadStream(path) after socket connection, sends INSTREAM to configured daemon                                | The stream opens a name after key resolution; scanner and transform later reopen independently. |
| Worker processing coordinator          | scan(job), transform(job), markReady, cleanupSource; existing quarantine/failure transitions                       | No attempt-local immutable source capability is shared between scanner and transformer.         |
| Shared @dss/storage                    | normalizeStorageKey/resolveStorageKey; no IO                                                                       | Remains portable key policy, not an implicit native filesystem sandbox.                         |

Source anchors:

- apps/api/src/core/storage/providers/local-storage.provider.ts;
- apps/api/src/core/storage/interfaces/storage-provider.interface.ts;
- apps/api/src/modules/media/application/services/media-binary-upload.service.ts;
- apps/api/src/modules/media/application/services/media-delivery.service.ts;
- apps/api/src/modules/media/application/services/media-retention.service.ts;
- apps/worker/src/local-media-file.processor.ts;
- apps/worker/src/clamav-media-malware.scanner.ts;
- apps/worker/src/media-processing.processor.ts and media-processing.types.ts.

Existing save/read/delete public provider shape and logical key/URL behavior are
compatibility requirements. Database Media policy, READY/quarantine, file access
and authorization remain with their current owners. Native storage must not
read Media tables or acquire feature privileges.

## Windows characterization already performed

Node24.18.0 on win32, isolated system-temp arena only:

1. Actual shared resolveStorageKey accepts an inside-root logical key whose
   parent is a junction; Node readFile follows it to an outside-synthetic sibling.
2. A normal parent and realpath initially inside the root pass the checks.
   Deterministically rename that parent within the arena and install a junction
   before open: reading the same checked string reaches the synthetic sentinel.

The outside sentinel remains unchanged. No project uploads, database connection,
network call, production mutation or recursive cleanup was used. This is an
actual shared-helper/Node-filesystem characterization, not API HTTP proof or a
native replacement's concurrent security test. Synthetic evidence is retained.

System-temp probe/report: dss-037-junction-characterization.cjs/.json.
Report checkedAt2026-10-29T09:22:55.049Z; SHA256:
56106a970806c331633190127f9861c0184895be56a1db90bbbab41b922799d4.

## Native primitive characterizations

These are isolated probes, not a selected runtime implementation or a complete
set of physical containment regressions.

### Windows handle-relative read and rename barrier

On Windows NT10.0.26300, a temp-only C# P/Invoke probe called NtCreateFile with
RootDirectory, one relative component and FILE_OPEN_REPARSE_POINT, then inspected
the opened object's attributes. Safe file read returned the inside sentinel;
an existing junction was rejected before content reading.

Held root/parent directory handles omit FILE_SHARE_DELETE. Moving either held
directory failed with error32; the same moves succeeded after closing the
relevant handles. This closed-handle control distinguishes the barrier from
unrelated fixture permissions. Outside sentinel bytes remained unchanged.
Root ancestor initialization, leaf symlinks, writes, publication, deletion,
hard-link cases and other filesystems/Windows versions are not certified here.

System-temp sources/report: dss-037-windows-handles.cs/.ps1/.json.
Report checkedAt2026-10-29T09:30:53.8973770Z; file SHA256:
2bf082ed0847d4d2ca51320d1ef709a6a1bd2be591d3468cac55c6cd11882cba.

### Linux openat2 read and parent-relocation counterexample

An already cached pgAdmin image supplied Python/ctypes for a disposable probe;
no package installation or application dependency was added. Container isolation:
pull=never, network=none, readonly rootfs, readonly probe mount, tmpfs fixtures,
uid5050. Actual kernel: Linux6.18.54.1-microsoft-standard-WSL2 x86_64.
Image ID: sha256:5d9624a93634d1c5e595619cc57b1d330758120d1baf445fa97300c0c1fc3c0a.

Root-relative openat2 with BENEATH/NO_SYMLINKS/NO_MAGICLINKS/NO_XDEV admitted a
safe file. A preexisting symlink and deterministic post-check ancestor swap were
both rejected with ELOOP40. The probe also deliberately composed an unsafe
mutation: securely open a parent directory, move that directory outside uploads
within the synthetic arena, then create through the held parent fd. Creation
succeeded in the moved directory. This is a counterexample to that composition,
not an openat2 vulnerability or evidence that all descriptor-relative IO is safe.

Outside sentinel bytes were unchanged; no DSS upload, DB or network was touched.
System-temp source/captured result: dss-037-linux-openat2.py and
dss-037-linux-openat2-result.json. Canonical report SHA256 (Python sorted-key JSON
of its report field, not the surrounding capture file):
87edbc36e579ab57d742ce24b0602b2853e378c9f3b67e2e07d8949cdcd46d6c.

### Consequence for mechanism selection

The hierarchical candidate cannot rely on a verified parent fd for later
namespace mutations. Its Linux proof gap is now concrete. Characterize the
flat-object/private-staging alternative next, including atomic publication of
the actual produced object, hard-link handling and protected staging identity.
Root initialization, data migration and logical-key/file-manager compatibility
remain separate review gates. No layout or migration is selected by these probes.

## Mutation and private-staging characterizations

### Linux different-identity writer

A disposable tmpfs probe used service uid5050 and attacker uid65534. Data-root
mode0777 allowed real attacker-created destination symlinks. Staging mode0700
and a mode0755 root-owned anchor parent prevented the attacker from unlinking/
replacing staged files or moving either protected root (EACCES13).

Directory-relative rename from protected staging replaced destination symlink
and hardlink entries without modifying the outside sentinel. The reader rejected
hard links/nonregular objects before payload reads. Direct unlink removed a
symlink entry without following its target. This proves those primitives under
the tested permission model; it does not certify root bootstrap, other filesystems,
snapshot/checksum semantics, durability or the production binding.

System-temp source/captured report: dss-037-linux-vault.py and
dss-037-linux-vault-result.json. Canonical report SHA256 (sorted-key Python JSON
of its report field):
ba19152e692ad359bba74735645fa4aa4788625f2fc06690d00bb199812a9064.
No image download, external network, host mutation or DSS data access occurred.
The cached Python's unnecessary file capability and default noexec runtime tmpfs
initially blocked probe startup; a private disposable runtime copy fixed that.
Fixture chmod/chown ordering and fixture reads were corrected without adding
CAP_FOWNER/DAC_OVERRIDE or relaxing assertions. Root only prepared fixtures and
dropped to the actual unprivileged service/attacker UIDs for tested operations.

### Windows source-handle publication and cleanup

The x64 temp-only native probe created a staged file by directory-relative
NtCreateFile, wrote/flushed it and published the same source handle into the
destination root. A hostile staged-name rename attempt failed with32 while the
source was held. A hardlinked destination was replaced without changing its
outside alias; reading that hardlink before replacement was rejected before bytes.
Publication over a directory junction failed; its staged object was removed by
its owned handle. A normal published file was likewise deleted by handle. The
outside sentinel stayed unchanged. ACL provisioning, root initialization,
snapshots, other builds/filesystems and crash durability remain unproved.

The initial Win32 SetFileInformationByHandle call returned error87; that exact
wrapper-call failure is retained, not declared a universal API limitation. The
successful probe uses direct
[NtSetInformationFile](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ntsetinformationfile)
FileRenameInformation10 and FileDispositionInformation13. Source identity and
outside-byte assertions were unchanged. Linux replacement semantics are described
in the [rename contract](https://man7.org/linux/man-pages/man2/rename.2.html);
atomic publication is not a claim of power-loss durability.

System-temp sources/report: dss-037-windows-publish.cs/.ps1/.json.
Report checkedAt2026-10-29T09:49:13.8958210Z; file SHA256:
4239692fddfacc42664cf3bd89073439619c4f4ce5fc7cc19d794b1f3e21c610.

### Layout selection remains open

These flat-leaf probes do not approve a physical layout migration. With the
owner-confirmed different-identity threat model, investigate whether enforced
service ownership/sticky-directory rules and native no-follow IO can protect the
existing hierarchy. That could avoid relocating every object. Verify actual
attacker rename rights, fail-closed ownership/mode checks and Windows ACL/handle
behavior first; do not just assume protected namespace metadata.
If preserving hierarchy cannot satisfy the required guarantees, review the flat
mapping, migration and file-manager compatibility explicitly before implementation.
Existing cross-platform development support must not be silently narrowed:
Darwin/macOS requires corresponding proof or an explicit owner disposition before
selecting a backend that would make it unsupported. Current local probes cover
Windows and Linux only.

## Documented platform constraints

[Pinned Node24 filesystem documentation](https://nodejs.org/download/release/v24.18.0/docs/api/fs.html)
lists the supported Windows open flags without O_NOFOLLOW. A portable
realpath/lstat-then-open patch is therefore not the required physical boundary.

[Linux openat2](https://man7.org/linux/man-pages/man2/openat2.2.html) can resolve
relative to a directory descriptor with resolution restrictions. Its documented
race errors must fail closed. This supports investigating safe open/create;
it does not by itself prove separate mkdir, unlink or rename sequences safe.
Do not require newer optional kernel flags merely because current documentation
mentions them: pin/test the deployment kernel and validate object type by handle.

[Windows NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile)
documents RootDirectory-relative names and FILE_OPEN_REPARSE_POINT.
Use those as candidate primitives, not a claim that a single leaf flag blocks
all ancestors. Inspect opened object attributes/tags and type through handles;
the [handle information contract](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileinformationbyhandle)
also makes filesystem-specific identity limitations explicit.
No reliance on an undocumented flag combination or a forum answer is accepted
as the sole security argument. Actual Windows tests must prove sharing/rename,
intermediate component, root binding and handle-lifetime behavior.

## Recommended architectural boundary, not yet a selected native algorithm

Keep @dss/storage's existing pure key helpers. Put physical IO in an isolated
storage-owned capability facade backed by native/platform primitives. API and
Worker adapters consume named operations; Media business code and queue payloads
never receive absolute paths, OS handles or native bindings. No arbitrary-path
escape hatch or permissive unsupported-platform fallback is allowed.

Acquire the complete operation's validated key plan before effects. For a Worker
attempt, bind an immutable or protected source snapshot before scanner/Sharp use;
compare the declared size/checksum and preserve current upload policy limits.
Scanning and processing must consume the same admitted bytes, not two independent
opens of a mutable key. Metadata/checksums must describe the admitted object.
Memory/streaming, file-handle lifetime and private spool permissions need proof,
not an unbounded Buffer conversion or a hidden timeout/size change.

Output must use exclusive creation and a safe publish operation rather than
truncating an attacker-selected existing object. Publish must bind the actual
produced object, not blindly rename a replaceable temporary pathname. Cleanup
must affect only admitted objects/entries; no recursive path-based deletion.
Preserve the existing state/audit/retry behavior around failures.

### Mechanism candidates requiring characterization

| Candidate                                                 | Assessment / unresolved requirement                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| realpath/lstat plus ordinary Node paths                   | Rejected as complete containment by the deterministic Windows counterexample.                                                                                                                                                                                                        |
| Hierarchical native root-relative IO                      | Preserves current layout. Must prove every ancestor/leaf operation, including parent relocation between verified open and later mutation; an opened directory descriptor alone is not a complete namespace-confinement proof.                                                        |
| Flat physical vault behind stable logical keys            | Removes attacker-controlled intermediate directories from ordinary object operations. Changes physical layout; key mapping, existing-data migration/rollback, orphan/file-manager visibility and atomic publication need explicit review. Not selected or authorized as a migration. |
| Restricted broker / OS confinement in addition to handles | May strengthen mutation confinement. Must prove the actual Windows/Linux deployment contract and fd/handle semantics; cannot silently replace the agreed threat model with ACL assumptions.                                                                                          |

A native addon/broker introduces a build/distribution maintenance boundary,
even though it need not replace the Node/Nest stack. Before selecting one,
verify compiler/runtime availability, pinned artifacts, startup readiness,
cleanup, worker sharing and supported filesystems. No new dependency or binary
has been installed in this package. Native runtime implementation is not started.

## Different-UID hierarchical relocation characterization

On 2026-10-29 a disposable Linux tmpfs probe used the cached image
`sha256:5d9624a93634d1c5e595619cc57b1d330758120d1baf445fa97300c0c1fc3c0a`,
with no network, project mount or writable container root filesystem. A root
fixture controller created service-owned directories (UID5050, mode1777), then
forked an attacker with UID65534, empty supplementary groups and verified
`CapEff=0000000000000000`. The attacker successfully created a file and symlink
in uploads, proving actual namespace write access. Renaming both a service-owned
parent and its service-owned nested directory failed with EPERM (errno1).
The same attacker successfully moved a service-owned child under a mode0777
nonsticky control directory. All assertions passed; kernel was
`6.18.54.1-microsoft-standard-WSL2`.

This supports investigating the existing hierarchical layout with enforced
service ownership and sticky protection on writable ancestors. It does not
select that mechanism or certify root initialization, metadata verification,
attacker-owned prefixes, Windows ACLs, macOS, other filesystems, source snapshots,
publication, deletion or crash durability. A held directory descriptor alone
remains insufficient: the earlier relocation counterexample still applies to
unprotected ancestors. Startup and each admitted chain must enforce the actual
ownership/mutation boundary rather than infer it from a pathname.

The first unprivileged Docker access was denied by the local named-pipe ACL;
the authorized isolated invocation completed with exit0. No DSS runtime, dev
database, host filesystem permissions or existing service was changed.

## Windows ACL admission requirements to prove

The [Windows file security contract](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights)
maps generic write to write-data, append-data, write-EA and write-attributes.
Consequently, granting ordinary generic Write to a namespace writer is not the
same as granting only permission to add entries. The
[specific rights contract](https://learn.microsoft.com/en-us/windows/win32/fileio/file-access-rights-constants)
distinguishes directory FILE_ADD_FILE/FILE_ADD_SUBDIRECTORY from FILE_DELETE_CHILD,
FILE_WRITE_ATTRIBUTES, WRITE_DAC and WRITE_OWNER. Existing handle rename barriers
do not constitute proof that every metadata/reparse mutation is blocked.

Candidate admission must inspect the opened directory's owner and effective
security boundary, including inherited ACEs and all attacker token groups.
Untrusted principals may have entry-creation rights, while service-owned anchors
must exclude untrusted owner/DACL changes, destructive child rights and metadata
mutation rights needed for redirection. Do not equate a matching service owner
SID with a safe DACL. A parent-only ACL inspection is insufficient: Windows
documents per-object authorization and that rename/move does not automatically
assign a new default security descriptor. Private staging therefore needs an
explicit descriptor carried through publication; public object permissions and
API/Worker service identity sharing must be designed together.

These are design requirements derived from documented rights, not completed ACL
runtime tests. A Windows characterization must exercise actual restricted writer
tokens against synthetic directories, including generic-write and destructive
rights controls, inherited grants, attacker-owned prefixes and reparse mutation
while service handles remain open. It must not create host users, modify project
uploads ACLs or silently grant broader privileges merely to make a probe pass.
Production provisioning, existing-data permission repair and any new native
distribution/build dependency require a reviewable implementation plan first.

## Next proofs and acceptance

1. Prove the chosen root-relative primitives in Windows and Linux synthetic
   arenas; include preexisting links, deterministic substitutions and directory
   relocation barriers. The Windows legacy characterization above is not this.
2. Cover read/create/replace/stat/copy/delete/root initialization and failed
   publication/cleanup separately; test hard links, nonregular files and handle
   exhaustion. Unsupported configurations must fail closed.
3. Select the physical layout and native boundary only after mutation proofs;
   review any existing-data migration before implementation. No dev-data rewrite.
4. Design one attempt-local source/snapshot lifecycle through scanner and Sharp,
   preserving quarantine, media CAS/DB ordering, hashes and response contracts.
5. Promote required regressions into maintained source with File Passports;
   run real Windows/Linux CI and full quality gate, then request packet acceptance.

Until those proofs, this is working design evidence only. DEBT-037, D7,
stack audit and Phase11 readiness remain open. No UI/frontend work is included.
