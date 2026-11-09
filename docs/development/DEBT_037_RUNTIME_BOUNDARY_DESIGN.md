# DEBT-037 — Physical LOCAL runtime boundary

Historical hostile-writer boundary. The owner's2026-11-08 clarification accepts
owner/DSS-only filesystem writers; users act through the website/API. See the
[current scope](DEBT_037_QUALIFICATION_DECISIONS.md). The native integration below
remains inactive research, not a current pre11 requirement.

Status: design for review, not runtime implementation or activation.
Baseline: accepted main `8e7f301` (PR128). This document carries forward the
[P2 requirements](DEBT_037_P2_DESIGN.md) and
[physical-parent protocol](DEBT_037_P2_PROTOCOL.md); it does not replace their
acceptance obligations with the narrower read experiment.

## Required end state

A separate OS user with write access to the uploads namespace must not make DSS
read, overwrite or delete an object outside the admitted physical storage tree.
The same UID/token, an administrator or a privileged kernel attacker is not the
agreed attacker. The writer must remain present in real acceptance fixtures;
removing all write access is not a solution. Denial of an unsafe operation is
acceptable; silently using the old pathname implementation is not.

All LOCAL API and Worker operations must use the physical boundary before joint
activation. Logical key validation, routes, upload policies, Media state rules,
checksums, quarantine behavior and successful public responses remain owned by
their existing components. No new role, permission, Media lease, table, timeout
or business retry loop is proposed.

## Source inventory and ownership

| Current surface                          | Existing owner/source                                    | Required runtime route                                               |
| ---------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| Buffer upload and stable key/URL         | API `core/storage/providers/local-storage.provider.ts`   | Private preparation followed by object-bound publication             |
| Signed/public delivery                   | Media `media-delivery.service.ts` through StorageService | Capture an admitted regular object and read that object              |
| Failed-intake compensation               | Media `media-binary-upload.service.ts`                   | Explicit current-key deletion remains current-key deletion           |
| Retention after DB claim                 | Media `media-retention.service.ts`                       | Current-key deletion, no recursive directory removal                 |
| ClamAV input                             | Worker `clamav-media-malware.scanner.ts`                 | Stream the attempt's private source snapshot                         |
| PASSTHROUGH, Sharp original and variants | Worker `local-media-file.processor.ts`                   | Consume that same snapshot; prepare private outputs                  |
| Output size/checksums                    | Same Worker adapter, currently readFile plus stat        | Inspect/hash the captured produced object, not reopened public paths |
| Source cleanup after READY               | Worker `media-processing.processor.ts` / file adapter    | Identity-bound cleanup of the source captured by that attempt        |
| Worker dependency wiring                 | Worker `main.ts`                                         | Attempt-local infrastructure composition and common admitted root    |

The inventory is source evidence, not a live exploit report. API currently uses
mkdir/writeFile/readFile/rm on resolved paths. Worker independently reopens the
input for scan, transform and output descriptions. Lexical validation is already
present; it cannot by itself supply the agreed physical guarantee.

## One infrastructure boundary

Keep `@dss/storage` portable key exports unchanged. Candidate new named technical
entry point: `@dss/storage/local`. It owns root admission, native resources,
private objects, physical-parent coordination and bounded IO. It must not import
Nest, Prisma, jobs, Media policies or a feature module. Only infrastructure
adapters consume it. Do not turn P1's probe exports into an admitted production
root by renaming their types.

The proposed capabilities are behavioral contracts, not implemented exports:

| Capability        | Input/output and responsibility                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `admitLocalRoot`  | Operator configuration to opaque runtime root after complete admission; refusal closes partial resources              |
| `preparePrivate`  | Validated bytes/stream to an owned private object; exclusive creation, bounded streaming, explicit finish or disposal |
| `publishPrepared` | Owned finished object plus validated logical destination to the same key/URL facts and captured published identity    |
| `captureSnapshot` | Validated source key to private completed snapshot plus opaque source cleanup evidence                                |
| `readSnapshot`    | Bounded reads/stream of a captured private object; no public-path reconstruction                                      |
| `removeCurrent`   | Validated key; deletes the current admissible leaf, missing leaf remains a no-op                                      |
| `removeCaptured`  | Opaque source evidence; under coordination removes only the still-matching object, otherwise skips                    |
| `close`           | Rejects new operations immediately; resources used by accepted in-flight operations remain alive until completion     |

Native descriptors/handles, absolute private paths, ACLs and identities never
enter DTOs, GraphQL/REST responses, Media business ports or serialized jobs.
No wildcard exports or general filesystem browser. Published objects are never
modified in place by DSS. Private preparation may span asynchronous processing;
namespace locks may not span JavaScript callbacks, network waits or Sharp work.

## Admission and the writable namespace

Admission must classify every actual opened ancestor, uploads root, destination
parent and private control/staging directory. The private control root must be
same-filesystem for publication and inaccessible to the attacker. Its ancestors
must prevent attacker replacement or relocation. Existing roots are not repaired
or trusted automatically. Unsupported identity, effective-access, ACL, mount or
filesystem metadata causes an explicit refusal before payload IO.

Distinguish a shared namespace where the attacker can create entries from a
service-owned object admitted for DSS operation. Attacker-created prefixes are
never adopted because their names happen to match. DSS-created prefixes require
explicit security and collision re-admission. Do not recursively mkdir through
unexamined entries. New private fixture objects may receive intended security;
existing deployment ACL/ownership changes require a separate reviewed procedure.

On POSIX, ownership/mode alone is insufficient: effective ACL/default-ACL,
ancestor replacement, sticky-directory behavior, mount changes and object links
must be covered. A directory descriptor does not itself prohibit relocation.
On Windows, current DACL checks do not erase historical capabilities, and
sharing flags do not exclude all attribute operations. Directory ADD_FILE may
also authorize a junction operation, as PR128's fixture demonstrated. Do not
model a directory's WRITE_DATA bit as ordinary file-content write permission.

Candidate shared POSIX topology uses a service-owned sticky uploads root and
protected service-owned descendants/control root. This is not selected or
certified: ACL interactions and separate-user attacks need platform evidence.
Windows must tolerate or reject namespace mutation through the operation's
captured-object primitive, not promise metadata immutability from sharing alone.
Neither proposal weakens the writer threat model or silently excludes an OS.

## Native operation selection and remaining evidence

| Platform | Candidate primitive family                                                                                                      | Still required before implementation selection                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows  | Component-relative NtCreateFile; source-handle rename/disposition using captured destination parents; captured object IDs       | Actual owner/effective-right admission, parent relocation, conditional publication/removal, historical handles and concurrent reparse mutation |
| Linux    | Per-component no-follow descriptor traversal; private creation, descriptor-relative rename/unlink; stable private flock objects | Effective ACL/mount admission; hostile-user schedules; complete identity/ownership checks and private-public publication                       |
| macOS    | Native descriptor traversal, ACL-aware admission and descriptor-relative mutation                                               | Concrete identity encoding, ACL/mount policy and filesystem evidence; Linux results are not a substitute                                       |

The accepted256-stripe physical-parent mapping and ordered acquisition remain
the coordination candidate. Every DSS namespace writer must participate. Fixed
stripe collisions serialize work rather than change correctness. Locks are
private/stable, never recreated while participants can hold them. Advisory
coordination constrains DSS writers; it does not grant safety against a hostile
OS writer. That guarantee also needs the admitted namespace and actual syscall.

PR128 proves only a finite synchronous Windows read matrix: WRITE_ATTRIBUTES-only
junction changes succeed despite READ sharing;16 captured-parent child opens
after reparse fail with `0xC0000280` and do not read the outside sentinel. The
positive read control succeeds. This supports investigating object-relative
operations; it does not prove rename/create/disposition behave the same way.
Do not implement publication with an unchecked path because read was safe.

For each selected mutation, use deterministic barriers for a separate-user
attacker before capture, after capture and immediately before the native
operation. Include historical handles and a replacement object with an outside
sentinel. An unsafe result changes the candidate, not the threat model or test.
Document unsupported configurations; do not certify arbitrary filesystems from
one hosted runner. Preserve existing development-platform availability until a
reviewed replacement and deployment policy are accepted.

## One source snapshot per Worker attempt

Use an attempt-local infrastructure composition, not a process-global map keyed
by mediaId, jobId or source key. Two attempts for the same Media remain distinct;
this design does not add a whole-job lease or change FAILED retry CAS semantics.

The Worker root constructs file/scanner adapters with a shared lazy snapshot
capability for that invocation, then invokes the existing semantic processor.
The processor still validates the whole job, checks terminal state and claims a
FAILED retry before input IO. Duplicate terminal work creates no source snapshot.
The first scan/transform captures it once; scanner and file adapter consume that
same completed private object. No handle is passed through a business method.
Finally, the infrastructure attempt disposes its private resources on every
success, duplicate, quarantine, scanner error, transform error or DB error.

ClamAV INSTREAM stays streaming; do not buffer an unbounded passthrough upload
merely to share bytes. Keep its timeout, response bound and backpressure policy.
Sharp must consume the private snapshot through a selected bounded stream or a
proved service-private path, never reopen the public temporary key. Publication
is outside scanning/transformation; checksums and size come from the finished
private output. Preserve input-pixel limits, output formats, dimensions, quality
and the existing business ordering of quarantine/READY/FAILED transitions.

Source cleanup after READY uses this attempt's captured source evidence; a
different object subsequently published at the temporary key must survive.
Retention and intake compensation retain current-key semantics rather than
pretending they have captured identity evidence. Missing current leaves remain
no-ops, unsafe parents/leaves do not. No recursive removal or stale
check-then-unlink outside coordination.

The private snapshot fixes a particular scan/transform identity boundary. It
does not assert that copying a mutable source produces a historic atomic file
version, nor grant ownership to an attacker-created source. The copied object
must finish and become immutable before it is scanned or transformed. Legacy
file admission and historical content-write handles remain explicit obligations.

## Failures, lifecycle and deployment

Keep owner-local technical failure types and explicit presentation mapping.
Unknown errors retain identity. API and Worker persistence/log paths must not
receive absolute paths, OS IDs, native handles, descriptor contents or secrets.
Retain bounded internal operator diagnostics separately from public failures;
no broad global exception framework. Missing-key behavior is the existing
operation-specific contract, not a reason to suppress containment refusal.

Close/failure tests include failed admission, partial directory preparation,
aborted stream, in-flight native work, queue shutdown and process crash. A crash
may leave private unpublished objects; recovery may reclaim only objects it can
prove privately owned. No broad recursive sweeper or new TTL is selected here.

P2 can be delivered explicitly inactive. Before enabling it, P3 must remove
every API/Worker pathname mutation and source reopen from the active LOCAL
route. Both processes must agree on root physical identity, private control
root and protocol version. Mismatch/refusal fails startup or the operation
explicitly, never falls back to lexical storage. A single-process rollout cannot
close DEBT-037. P4 also inventories deployment/proxy/static-file routes so an
unprotected external `/uploads` reader cannot bypass the boundary.

Existing uploads require an operator-reviewed adoption plan and evidence. No
automatic chmod/chown/ACL rewrite, root relocation, file copying, dev-data reset
or new native dependency is authorized by this design. No activation flag name
or default switch is introduced before the rollout contract is reviewed.

## Concrete delivery and acceptance gates

1. Review this runtime boundary and the explicit snapshot/current-vs-captured
   cleanup semantics. Select the first native admission/mutation subpacket only
   after its supported platform fixture and syscall evidence are concrete.
2. Implement and adversarially verify inactive root/control admission and
   resource lifecycle. All currently supported OS families retain a truthful
   readiness matrix; no permissive stub or silent platform removal.
3. Add private preparation, captured reads, publication, current-key deletion
   and captured cleanup with exact produced-byte checks. Test aliases, nested
   keys, nonregular/multilink objects, hostile parents, preexisting handles,
   collisions, crash release and replacement under deterministic barriers.
4. Wire API adapters and attempt-local Worker snapshot/scanner/transform/cleanup
   together without activating an API-only route. Regress current HTTP, queue,
   DB/audit ordering, malware quarantine and both scan-required settings.
5. Qualify supported filesystem/ACL layouts, measure contention/stream bounds,
   review deployment adoption, run full quality/CI and obtain packet acceptance
   before joint activation. Only complete physical acceptance closes DEBT-037.

This is a bounded implementation plan with explicit unknowns, not completed
runtime security. The design package itself still requires full quality/CI and
owner acceptance. D7, stack audit and Phase11 remain separate gates.

## Evidence references

- [PR119 historical-handle proof](DEBT_037_WINDOWS_IDENTITY_PROOF.md)
- [PR128 exact access/sharing/read matrix](DEBT_037_RELATIVE_HANDLE_PROOF.md)
- [Cross-process coordination proof](DEBT_037_COORDINATION_PROOFS.md)
- Native source: `packages/storage/native-probe/src/platform-win.cc` and
  `platform-posix.cc`; these are P1 probes, not production admission.
- Worker orchestration: `apps/worker/src/media-processing.processor.ts` and
  `main.ts`; unchanged semantic ordering is the compatibility baseline.
