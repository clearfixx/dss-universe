# DEBT-037 — Physical local storage design and evidence

Date: 2026-10-29. Source baseline: accepted main289b24c.
Status: WORKING DESIGN; inventory and Windows characterization only.
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
