# DEBT-037 — Qualification decisions after R6

Baseline: accepted R6 / [PR140](https://github.com/clearfixx/dss-universe/pull/140),
main `1781916079bcf0d1642aa6bb5b416006cca42337`. Status: design for review.
This packet changes documentation only. It refines the accepted
[owner/right policy](DEBT_037_OWNER_RIGHTS_POLICY_DESIGN.md) and preserves the
[complete API/Worker boundary](DEBT_037_RUNTIME_BOUNDARY_DESIGN.md).

## Decisions supported by current evidence

R6 provides usable query routes, not a production storage profile. Its final
artifacts distinguish Linux idmapped mounts and Darwin ownership-disabled
volumes under ordinary service credentials. Namespace stability is not initial
host-namespace evidence. Windows locality observations do not qualify remote or
removable media. A captured-directory query after attacker mutation is not a
publication, snapshot or deletion proof.

Keep qualification as separate native obligations: identity domain, filesystem
semantics, role rights, topology/transition, creation, and the requested operation.
No aggregate test count, caller boolean or successful family-name comparison
can satisfy one of those obligations. Unknown required facts refuse payload IO;
supported positive deployments must also remain demonstrably usable. The
ordinary OS writer remains able to create in the shared namespace on every OS.

Candidate profiles below name investigation targets. They are not selectable
production configuration, a new allowlist, or permission to drop an OS family.
Minimum runtime/SDK versions require an acquisition and positive-operation
matrix; the versions of hosted CI machines alone cannot define that support.

| Candidate                               | Required positive premises                                                                                                                                                    | Negative/unresolved controls                                                                                                                           | Current decision                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Windows local NTFS with persistent ACLs | Actual primary service token; internally classified owner and complete supported DACL; handle-bound local/device facts; protected control and operation-safe shared parent    | Historical handles, reparse mutation, relocation, null/unsupported ACE forms, denied service operation; remote/removable fixtures are not yet measured | Eligible for further mechanism proof; not admitted                        |
| Linux local POSIX-ACL storage           | Qualified caller/owner identity domain; returned unique mount binding; non-idmapped storage region; actual POSIX ACL/mode/default semantics and service access                | Mapped caller domain, mapped mounts, unavailable fields, changed namespace/mount, dangerous ACL/inheritance, sticky-parent replacement                 | R6 closes query feasibility for tested mounts, not identity or operations |
| macOS local APFS with ownership enabled | Actual non-overridden service context; ownership-enabled writable non-snapshot volume; complete supported ACL bound including ancestors; operation-bound transition invariant | Ownership ignored, omitted security evidence, unsupported ACE forms, inherited grants, relocation and changed parent                                   | Ownership flag route proved; ACL completeness and operations remain open  |

Linux R6's `ext` family is not an ext4 version identifier. An APFS or NTFS
label similarly supplies no mutation guarantee. A qualified volume boundary
above data/control is permitted; requiring all OS ancestors to share one mount
would reject legitimate deployments. The private stage and publication target
still require their actual same-filesystem relationship.

## ACL decision: do not combine dependent observations into an absence proof

The current Darwin R5 reader in
`packages/storage/native-probe/src/rights-darwin.cc` correctly leaves an omitted
returned-security attribute unresolved. Its supported full-record path remains
usable for bounded nonempty/explicit-empty ACL analysis; it cannot qualify the
fresh no-record ancestor by changing that ancestor's ACL.

Additional source review makes the rejected shortcut precise. Apple's pinned
`acl_file.c` calls `fstatx_np` and then retrieves the FILESEC_ACL property.
Those calls are one acquisition chain, not two independent confirmations.
The pinned XNU attribute packer sets the returned security bit only when the
vnode reports ACL support and supplies a non-null ACL. Omission therefore does
not distinguish unsupported acquisition from a missing record. A general volume
capability flag does not directly answer that per-object distinction. The getter
manual also permits unsupported retrieval and other errors; NULL/ENOENT alone
does not close this gate.

Required resolution: a supported descriptor-bound contract that distinguishes
the relevant states on the selected filesystem, or an independently justified
conservative bound with explicit premises. Review both acquisition and failure
semantics before adding another native probe. Merely repeating getter/property/
returned-bitmap measurements from R4 is not a new decision-changing experiment.
Complete malformed/unsupported records must remain refusals. No private
FILESEC_ACL_RAW, pathname fallback, deny subtraction or blanket ACL repair.

Linux is a different contract: the group-class/mask bound can constrain named
grants on a qualified POSIX-ACL filesystem. ENODATA still is not a portable
absence proof. Default ACLs and resulting child rights need their own evidence;
a directory's safe current mode does not establish safe inherited children.

## Identity decision: name the missing authority

The service credential fingerprint must match the actual native worker before
and after an operation. R5 supplies this observation. Linux R6 additionally
compares held/fresh namespace objects. Neither observation establishes who may
be treated as the OS administrator in that identity domain.

The future implementation must document its independent identity-domain
authority and validate its relationship to captured owners/mounts. A configured
`trustedHost`, process ID1, a namespace inode constant, EPERM from a parent query,
or a stable namespace comparison is insufficient. UID0 in a mapped domain must
not gain host-administrator trust. Do not solve this by requiring DSS to run as
root or by silently excluding legitimate development platforms.

Until this gate is resolved, `OsAdministratorCandidate` remains a conditional
R5 classification. It cannot authorize root/ancestor admission. Windows trustee
SIDs and Darwin owner UUIDs also remain private; display names and website roles
never supply identity authority. Same-service-token and administrator/kernel
attackers remain excluded exactly as agreed; ordinary historical handles remain
included.

## Operation decision: prove effects, not only metadata

Retain the accepted Windows historical-handle and FILE_ADD_FILE junction
counterexamples. R6's held-parent query does not supersede them. Windows/Darwin
lack a qualified unique mount identity in the current implementation; use a
proved operation-bound transition invariant or a supported new query contract,
never filesystem-ID equality relabelled as mount equality.

The next mechanism acceptance matrix must use the actual proposed primitive and
barriers with two ordinary actors. It must include a usable positive operation
and a byte-checked outside synthetic sentinel for each case:

| Operation        | Required effect and hostile schedules                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capture/snapshot | Read only the admissible regular source; refuse symlink/reparse/hardlink and foreign-owner controls under the selected policy; move or replace parent/leaf before and during capture; finish a private immutable snapshot before scanning               |
| Prepare/publish  | Exclusive private creation; inspect resulting owner/inheritance before use; atomic same-filesystem publication to the intended admissible parent; tolerate/refuse attacker collisions, parent relocation and reparse mutation without outside overwrite |
| Current removal  | Missing admissible leaf is a no-op; delete only the current admissible leaf under physical-parent coordination; unsafe leaf/parent is a refusal, not a recursive removal                                                                                |
| Captured cleanup | Compare retained source evidence under coordination; a different object at that name survives; exercise replacement, hardlink, historical-handle and parent-mutation schedules                                                                          |
| Close/failure    | Refuse new work after close; retain accepted in-flight resources until completion; release partial acquisitions/private objects on every failure without public-path cleanup                                                                            |

Private lock identity remains keyed by physical parent and the accepted stripe
protocol; logical path aliases cannot create independent locks. Locks coordinate
DSS processes, not hostile writers. No lock may span JavaScript callbacks,
network waits, scanning or Sharp transformation. A private snapshot preserves
the bytes actually copied; it does not claim an atomic historic version of a
source that an attacker can mutate.

## Bounded sequence to completion

1. Resolve the ACL-completeness and identity-domain authority decisions above
   with supported contracts and a specific positive layout per OS. Record an
   unsupported route as unsupported. Do not manufacture a qualified result to
   enable the next step. Read-only source review needs no new native harness.
2. Obtain separate approval for a concrete inactive implementation/mechanism
   package with named native APIs, resource ownership, query/decoder bounds and
   exactly the new disposable fixtures needed. Every new probe must identify a
   row above that its result could accept or reject. Repeating R6 is not a gate.
3. Combine qualified rights/filesystem/identity and proved operations into an
   opaque admitted root with lifecycle tests. No public evidence JSON is an
   internal policy input. API/business modules receive no OS identities or ACLs.
4. Integrate all nine source-inventory surfaces in the runtime-boundary design.
   Worker scan, transform and output descriptions share one completed private
   snapshot per attempt. Keep current-key and captured cleanup distinct.
5. Review deployment preparation/adoption separately, including historical
   capabilities. Never silently chmod/chown, attest legacy roots or move uploads.
   Jointly activate API/Worker only after the full operation and integration
   matrix passes. There is no lexical or per-OS legacy fallback.

Each logical package retains exact-source full quality/build/CI and owner
acceptance before merge. No new native code, privileged fixture scope, npm/OS
package, ACL/data repair, API/Worker activation or frontend change is authorized
by this design packet. DEBT-037, D7, stack audit and the Phase11 brainstorm are
still required; none is closed by this document.

## Reproducible source review

Only contracts were reviewed; no upstream implementation was copied or executed.
The pinned sources are version-specific evidence, not proof of the library/kernel
installed on a runner. Downloaded copies are tool-managed cache artifacts.

- [Apple ACL acquisition](https://github.com/apple-oss-distributions/Libc/blob/71bbe350ab79eef58113991d817ccc6165061a64/posix1e/acl_file.c),
  lines72–89; SHA256 `61a075c38c4c3d5d382248d9b0a52894012f54d8310009402c218e7907c76b78`.
- [Apple ACL getter manual](https://github.com/apple-oss-distributions/Libc/blob/71bbe350ab79eef58113991d817ccc6165061a64/posix1e/acl_get_fd.3);
  SHA256 `fde66db04bbbec0c89fd8d006064bae25d8dfbcce5744f7c4b07c717fe1d3402`.
- [Apple attribute packing](https://github.com/apple-oss-distributions/xnu/blob/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/bsd/vfs/vfs_attrlist.c),
  lines2051–2064; SHA256 `3fcbca58e2d63963115ecd4aa1e27c3d1f7dc21f124897c8bdfdf9916b503c06`.

The initially attempted `posix1e/acl_get.c` URL returned404; no evidence is based
on that nonexistent file. The reviewed acquisition file is `acl_file.c` above.
