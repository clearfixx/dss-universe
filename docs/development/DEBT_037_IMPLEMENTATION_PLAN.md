# DEBT-037 — Proposed implementation boundary

Status: design proposal, not runtime authorization or debt closure.
Baseline: main289b24c plus the characterization branch. Read the
[physical storage evidence](DEBT_037_PHYSICAL_STORAGE_DESIGN.md) first.

## Proposed layout and ownership

Prefer retaining existing logical keys and the hierarchical uploads layout.
Flat-vault remapping is not selected; no data migration is authorized by this
proposal. A private sibling control/staging directory must share the required
publication filesystem and have a protected anchor and service-only permissions.
API and Worker use the same dedicated service identity or an explicitly verified
equivalent deployment policy. Ordinary site roles are unrelated to this identity.

Keep portable key validation in the existing named @dss/storage exports. Expose
physical operations through a separate infrastructure entry point; do not add
native handles or absolute paths to Media business contracts or BullMQ payloads.
The physical backend owns resource lifetime, root admission, native bindings and
OS errors. Media retains upload policy, authorization, DB states and audit.

An in-repository minimal native binding is a candidate, not an approved dependency
or language/toolchain change. A local read-only inventory found MSVC tools under
F:/DevTools/VisualStudio/2022/Community. That establishes availability only, not
a successful Node binding build or distributable artifact. Before selection,
prove pinned Node24 builds, asynchronous IO/resource cleanup, supported CPU/OS
artifacts and CI reproduction. Do not install a compiler or silently fall back
to ordinary pathname IO on an unsupported configuration.

## Root and operation admission

1. Bind a configured root through a protected ancestor chain, reject links,
   reparse points and unsupported mount/filesystem transitions, then inspect
   metadata on the opened objects. A string realpath check is insufficient.
2. On POSIX, service ownership and nonwritable-or-sticky ancestor rules are a
   candidate admission predicate. On Windows, check effective metadata/destructive
   rights, inherited grants and token groups, alongside no-follow relative opens.
   Requested directory handles can be read-only; sharing must still permit the
   tested publication primitive. Share-READ-only broke native publication.
3. Reject unsafe existing configuration before binary reads/writes. Do not
   recursively chmod/chown existing uploads or repair production ACLs implicitly.
   Existing data permission repair and rollout need an explicit reviewed plan.
4. Admit regular files through handles, including owner, link-count and write
   protection checks; reject device/nonregular/reparse objects before payload IO.
   Existing handles acquired before admission and root replacement races need
   explicit adversarial tests, not only static mode/DACL assertions.
5. Validate the complete operation's key plan before file or socket effects.
   Creating output parents must admit each directory actually opened/created;
   an attacker-owned preexisting prefix must not be adopted as trusted.

These rules remain a proposal until complete-chain/root tests exist on supported
filesystems. Current tmpfs and Windows primitive probes are not universal proof.
Windows distinct-user logon and Darwin/macOS coverage remain required decisions;
do not silently remove existing cross-platform development support.

## One admitted source per Worker attempt

Current source anchors are media-processing.processor.ts, media-processing.types.ts,
local-media-file.processor.ts and clamav-media-malware.scanner.ts in apps/worker/src.
Today scanner.scan(job) and files.transform(job) independently open temporaryKey.
Sharp also reopens the same path for each variant; metadata uses separate read/stat.
The producer already supplies byte size and SHA256 in MediaProcessingJob after
checking the uploaded binary. No new queue fields are proposed for this purpose.

Propose an attempt-local opaque admitted-source capability:

1. After current terminal-state/retry admission, securely open the source once.
   Stream it into an exclusively created private snapshot, count bytes and hash
   the exact copy. Stop on excess bytes; require exact declared size and SHA256
   before any scanner or image consumer receives the capability. Do not treat
   Redis payload fields as filesystem paths or change upload limits implicitly.
2. Close the snapshot writer before consumer admission; keep its identity and
   private namespace protected throughout the attempt. Source replacement after
   admission cannot change snapshot bytes. Private staging itself must resist
   the agreed different-OS-user attacker, including preexisting handles.
3. ClamAV consumes a fresh readable stream from that snapshot capability.
   Preserve INSTREAM framing, backpressure, response bounds and timeout policy.
   Do not re-resolve temporaryKey after opening the socket.
4. Sharp consumes the same private snapshot for original and variants. A private
   pathname bridge may exist only inside the trusted Sharp infrastructure adapter
   after private-root proof; it must not expose paths to business code. Prove
   library reopen behavior against the actual installed Sharp/libvips version.
   Preserve failOn=warning,40million input pixels, rotation, resize and quality.
5. Avoid an unbounded Buffer conversion merely to remove pathname use. Sharp's
   [constructor](https://sharp.pixelplumbing.com/api-constructor/) and
   [output APIs](https://sharp.pixelplumbing.com/api-output/) support different
   input/output modes, but API support alone does not prove equivalent memory
   behavior. A protected disk spool is the candidate until resource measurements
   and native/Sharp interaction tests establish a bounded alternative.
6. Dispose attempt-local streams, handles and unpublished staging objects in
   finally, including infected, scan-unavailable, transform failure and DB failure.
   Disposal must not follow a mutable public key to remove an unrelated object.

Proposed failure mapping preserves the existing stage boundary: when scanning is
required, snapshot admission occurs inside the scan-stage failure boundary and
failure quarantines with SCAN_UNAVAILABLE; without required scanning, admission
failure follows the existing PROCESSING_FAILED path. New size/checksum rejection
must be covered explicitly, never reported as a clean or infected malware verdict.
Actual INFECTED still uses MALWARE_DETECTED and retains the original quarantined
source. Disposing its private attempt copy must not delete that source. Cleanup
of the original remains after successful markReady; quarantined clean rescan
retains its existing markProcessing ordering. These are proposed regression
requirements, not a claim that every new error shape is already compatible.
Do not infer that the existing FAILED-state CAS is a whole-attempt lease.

## Outputs, metadata and cleanup

Create outputs exclusively in private staging. Sharp may write a private path
only under the verified protected namespace; native publication binds the actual
produced object. Hashes, byte size and image dimensions must describe that object,
not independent reads/stat of its eventual mutable destination name. Publish
through an admitted parent and preserve logical keys, URL/API shapes and formats.

Publication is atomic per file, not a new transaction across every variant and
the database. Do not promise exactly-once transforms, whole-attempt exclusivity
or power-loss durability from rename alone. Preserve READY visibility ordering.
Manual retry, duplicate jobs and partial-publication failure require regressions.

Define ordinary delete-current-key separately from cleanup of a captured source
or unpublished output. A check-then-unlink identity comparison is not an atomic
conditional removal on POSIX. Before implementation, prove how short same-key
infrastructure coordination across API/Worker and protected namespace ownership
prevent deleting a replacement during identity-bound cleanup. This is not a
proposal for a new Media business lease, global job lock or retry policy.

## Proposed delivery stages and acceptance

| Stage | Reviewable result                                         | Required evidence                                                                                                                                                    |
| ----- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1    | Native-boundary/build proposal and root/file capabilities | Complete-chain admission; Windows actual token groups/privileges and distinct identity; Linux ownership/mount/ACL behavior; Darwin disposition; resource cleanup     |
| P2    | API physical save/read/delete and private publication     | Real outside sentinels unchanged; early unsafe-root rejection; identity-bound cleanup; existing HTTP/audit contracts; no data/ACL migration                          |
| P3    | Worker snapshot/scanner/Sharp integration                 | Scanner/transform byte identity; source replacement after admission; checksum/size failures; private-spool attack controls; real image metadata and failure disposal |
| P4    | Deployment/CI and final integration                       | Required platform regressions, full quality gate, migrated disposable DB regressions, build and green CI; explicit packet acceptance                                 |

No stage may claim the complete debt closed independently. Stages P2/P3 must not
leave a permissive old adapter available as an unadvertised fallback. Packaging
must distinguish intermediate build/test capabilities from an activated runtime
route. Runtime, new build dependencies, platform support and any permission repair
remain review gates; this document does not authorize them. The design packet
itself still needs its full gate and PR review before acceptance.
