# DEBT-037 — Owner, access and filesystem qualification policy

Historical hostile-writer policy. The owner's2026-11-08 clarification accepts
owner/DSS-only filesystem writers and website/API-only users. The
[current scope](DEBT_037_QUALIFICATION_DECISIONS.md) supersedes the mandatory
pre11 admission/identity proof work below; no native activation is implied.

Baseline: accepted R4 / PR135, main `6ae392f`. Status: design for review;
no policy implementation, deployment repair or runtime activation. This refines
the [admission design](DEBT_037_ADMISSION_POLICY_DESIGN.md) and preserves the
complete [LOCAL boundary](DEBT_037_RUNTIME_BOUNDARY_DESIGN.md).

## Required result and current gap

A distinct ordinary OS user retains write access to shared uploads. DSS must
not be induced to read, overwrite or delete outside admitted physical storage.
API and Worker must both use the final boundary. Removing the writer, dropping
an OS, using a pathname fallback or rejecting every legitimate deployment does
not satisfy that result. Website roles have no part in native admission.

R1 captures objects/ancestors; R2 reports bounded security observations; R3
reports identity/topology; accepted R4 measures actual POSIX ACL controls.
None supplies a complete admitted root. Counts, names and matching IDs alone
cannot fill the owner/right, filesystem or hostile-operation obligations.

R4 measured Linux 7/7 and Darwin 6/6 real actor controls, plus EBADF controls.
On Darwin the fresh and explicit empty fixtures both returned getter ENOENT;
only the latter returned a 44-byte extended-security record. Nonempty controls
returned 68 bytes. These lengths identify measured fixtures, not an ACL parser
or portable absence contract. See [R4 evidence](DEBT_037_R4_ACL_CONTRACT_PROOF.md).

## Native ownership and decision boundary

The implementation belongs to private storage infrastructure. API/Worker
infrastructure receives opaque capabilities or bounded refusal categories;
business ports, DTOs, jobs and logs receive no native IDs, paths, tokens or ACLs.
R1–R3 observation contracts remain unchanged. No caller can declare an object
trusted, choose arbitrary native rights or name a particular attacker as the
whole population to exclude.

Internal evaluation keeps separate results for owner, actual service access,
untrusted access bound, parent/inheritance, filesystem and operation protocol.
Each obligation is satisfied, violated, unavailable or unsupported. Any missing
required obligation refuses the operation. A successful rights result is only
eligibility evidence; it never constructs an admitted root by itself.

Evaluate identity in the actual credential context used for native operations.
Do not substitute process identity for an active thread impersonation token or
assume unchanged POSIX credentials/groups. A root records its service identity;
an operation must use the same qualified context or refuse. This design does
not authorize privileged credential changes or an impersonation feature.

Candidate principal classification, to review before implementation:

- DSS-owned descendants, prepared objects and private control belong to the
  exact service principal. Another ordinary owner is refused.
- OS ancestors may belong to that principal or an explicitly qualified OS
  administrator identity. POSIX root and Windows LocalSystem/Administrators are
  candidates only within the qualified identity domain. UID 0 in an arbitrary
  mapped namespace is not silently treated as the host administrator.
- All other owners, trustees and grants are untrusted for the relevant bound.
  A service token's group membership does not make that entire group trusted.
- Administrator/kernel and same-service-token attackers remain outside the
  agreed model. Ordinary historical handles remain inside it.

## Fixed role and operation matrix

| Role               | Positive DSS requirement                                                       | Untrusted boundary                                                                      | Additional obligation                                                        |
| ------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ancestor`         | Traverse and obtain required identity/security facts                           | Protect the next DSS component against replacement/relocation and security change       | Check the actual parent; sticky exception needs its own proof                |
| `shared-namespace` | Traverse and perform the approved publication/capture operations               | Writer creation remains allowed; no trust in writer-owned collisions or mutable entries | Each operation must tolerate/refuse hostile mutation                         |
| `protected-parent` | Traverse, create/publish or remove children as the selected operation requires | Exclude untrusted namespace, security and relevant child mutation                       | Parent rights and inherited child grants are included                        |
| `private-control`  | Create/use stable locks and prepared/snapshot objects; dispose them safely     | Exclude untrusted payload reads/writes, namespace and security mutation                 | Same-filesystem publication; private resources stay owned for their lifetime |

Positive service access is selected per operation, not a universal full-control
request. Private preparation needs exclusive create/write and cleanup; snapshot
capture needs a qualified regular source and private destination; publication
needs source/destination mutation rights; current removal and captured cleanup
retain their different identity semantics. The eventual native primitive must
prove its exact requested rights rather than reuse this descriptive table as
an OS access mask.

Include security metadata and link/relocation effects in mutation bounds.
Checking payload write permission alone does not protect a directory. Current
permissions do not erase previously opened capabilities. Source hardlinks,
replacement leaves and attacker-owned collisions remain explicit operation
proof cases; owner equality and link count are not a substitute for them.

## Linux candidate bound

For a qualified POSIX ACL filesystem, owner access, named user access, group
class/mask and other access have distinct evaluation rules. The mask limits
named users and group entries; default ACLs affect newly created objects.
These are [Linux ACL contracts](https://man7.org/linux/man-pages/man5/acl.5.html),
not Darwin rules.

Proposed conservative protected-object predicate: require a qualified trusted
owner and prove that group-class and other permissions exclude every forbidden
operation. For private objects, include read as well as mutation. This may
accept an ACL with named entries whose applicable mask excludes the forbidden
rights; it does not pretend the ACL is absent. If the bound is insufficient,
refuse rather than enumerate a single test account or silently broaden trust.

The bound is conditional on actual filesystem/identity semantics. ENODATA alone
does not establish those premises. A mode-based bound must explicitly justify
why all applicable ACL grants are constrained on the qualified filesystem.
An ordinary service-access check still accounts for its actual supplementary
groups and may fail even when the untrusted bound passes.

For newly created directories/files, record requested mode and actual resulting
owner/access/default-ACL facts before use. A safe parent mode is not a child
inheritance proof. A sticky shared root is a candidate only after separate-user
unlink/rename/replacement schedules prove protection of service-owned children.
Do not generalize Linux's R4 mask/default controls to that untested schedule.

Identity mapping and mount identity require separate qualification. The kernel
documents [idmapped ownership](https://www.kernel.org/doc/html/latest/filesystems/idmappings.html);
[statx](https://man7.org/linux/man-pages/man2/statx.2.html) has returned-field
availability. Preserve unavailable fields and do not replace a missing mount
identity with device equality or interpret every observed UID in one domain.

## Darwin acquisition and rights gate

Darwin requires an extended-ACL-aware bound over every applicable allow grant,
the POSIX mode contribution, owner/security rights and parent deletion effects.
Do not subtract a deny grant to justify ignoring a dangerous allow grant until
that exact interaction is proved. Unknown tags, qualifiers, flags, inheritance
forms or generic rights are unavailable/unsupported for the bound, not empty.
Only-inherit grants still matter for future children even if not effective on
the current object. A concrete service positive check remains separate.

Candidate acquisition route: descriptor-bound returned extended-security
attribute, validated complete native representation, then the public ACL
translation/iteration APIs. Apple's reviewed
[public header](https://github.com/apple-oss-distributions/Libc/blob/71bbe350ab79eef58113991d817ccc6165061a64/include/sys/acl.h)
declares `acl_copy_int_native`; the reviewed
[implementation](https://github.com/apple-oss-distributions/Libc/blob/71bbe350ab79eef58113991d817ccc6165061a64/posix1e/acl_translate.c)
takes no buffer length and iterates the declared entry count. Neither source
pin proves the runtime installed on a CI machine.

Before any import, validate actual SDK format availability, returned bitmap,
reference offset and complete extent, native header, bounded entry count and
overflow-safe total size. Never infer count from 44/68 bytes, import a truncated
record, inspect private FILESEC_ACL_RAW, or copy an upstream implementation.
Use the SDK's reviewed public format contract, not invented numeric offsets.
If that format cannot be qualified, this candidate cannot become runtime code.

Required actual evidence: empty and nonempty import/iteration, named/inherited
allow and deny controls, malformed/truncated/oversized record refusal, genuine
query failures and correct allocation cleanup. Synthetic decoder negatives
must be labelled as decoder tests, separate from genuine OS failures.

An omitted security attribute or getter ENOENT remains unresolved unless an
independent supported, filesystem-qualified contract proves the needed bound.
An explicitly empty fixture is not permission to rewrite existing ancestors or
uploads ACLs. This is a named implementation gate, not a deployment instruction
or a reason to silently drop macOS.

## Windows service check and untrusted bound

Obtain the actual security descriptor and qualified service token internally.
The candidate service check uses
[AccessCheck](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-accesscheck)
with an appropriate impersonation token and mapped object-specific requested
rights; distinguish API failure from a completed denied check. Its answer is
about that token, not every other token. The documented limitations of
[GetEffectiveRightsFromAcl](https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-geteffectiverightsfromaclw)
make it an unsuitable replacement for the complete pair of obligations.

The separate conservative bound validates owner identity and every applicable
allow grant, expanding generic rights for the actual object kind. Include
WRITE_DAC/WRITE_OWNER, relevant data/attribute/reparse rights and both object
DELETE and parent DELETE_CHILD effects. For descendants, include inheritance
and CREATOR/OWNER-related forms in the reviewed model or refuse them. Reject
unsupported conditional/object-specific ACEs rather than discarding them.

[File access constants](https://learn.microsoft.com/en-us/windows/win32/fileio/file-access-rights-constants)
distinguish file and directory operations. In particular, the shared-directory
ADD_FILE permission must retain the accepted PR128 Windows junction counterexample;
it cannot be labelled harmless payload write. A shared root may therefore be
eligible for an operation only together with its proven captured-object protocol.

[Null and empty DACLs](https://learn.microsoft.com/en-us/windows/win32/secauthz/null-dacls-and-empty-dacls)
are different. A null/absent DACL cannot satisfy a protected role's untrusted
bound; an empty one does not satisfy required service access just by denying
ordinary grants. Both positive and negative obligations are checked explicitly.
Trusted current ACLs cannot dispose of ordinary historical handles: retain the
accepted PR119/128 hostile-handle schedules in operation acceptance.

## Filesystem qualification and evidence lifetime

Define a qualification profile by native identity domain, filesystem semantics,
required handle/descriptor queries, ACL contract and operation guarantees. A
family string such as NTFS, APFS or ext4 is only a candidate label. No production
allowlist or minimum supported OS/kernel/SDK version is selected here. A later
review must name the actual supported profiles and their positive fixtures.

R3's Windows/Darwin mount identity remains unsupported. A completed design must
either establish a supported native mount/transition contract or prove the
necessary transition invariant through operation-bound evidence. It cannot mark
the missing obligation satisfied merely because two filesystem IDs match.
Windows [handle-bound volume information](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumeinformationbyhandlew)
is one input, not a mount or mutation certificate.

Allow qualified storage-volume boundaries above the data/control region;
requiring every OS ancestor to share one mount would reject legitimate layouts.
Inside that region, source/destination publication and stable private locks need
their proved identity/filesystem relationship. Network/overlay/bind/snapshot or
removable configurations remain unqualified until their relevant guarantees
are established. This is a configuration gate, not removal of an OS family.

Security/topology observations describe captured objects at an instant. To use
them later, prove that the admitted topology prevents untrusted invalidation or
perform the operation's required fresh checks under its actual synchronization.
An old observation, global path cache or before/after pathname stat cannot close
the race. API and Worker must agree on identity, qualification and protocol.

## Work sequence and concrete acceptance

1. Review this role/principal/rights model and the exact qualification premises.
   Resolve Darwin omitted-security evidence and Windows/Darwin transition
   invariants before promising a complete admitted root. Every further probe
   must identify which named decision gate its result changes.
2. Implement only an expressly approved inactive owner/right subpackage with
   private internal facts, bounded refusals and resource-lifecycle tests. Keep
   existing observations and all supported OS coverage. Author helpers under
   tools/agent-helpers; established build/test scripts stay with storage.
3. Prove the role matrix on real distinct service/attacker actors: usable
   positive layout; wrong owner; dangerous named/inherited grant; service-denied
   layout; private read/write isolation; shared writer creation; parent
   rename/delete; stale evidence; query/unsupported failures. Use barriers and
   separately authorized disposable CI privilege boundaries, never developer
   uploads, new local accounts, sleeps or retries-to-green.
4. Finish publication/current-delete/captured-cleanup and historical-handle,
   hardlink and replacement proofs. Combine all conjunctive obligations into
   actual admission and lifecycle; a passing rights module alone is insufficient.
5. Integrate every accepted API/Worker LOCAL route and one snapshot per Worker
   attempt. Separately review provisioning/adoption, then jointly activate and
   verify no lexical fallback. Preserve Media/quarantine/API semantics.

Positive availability is mandatory: protected control must be usable by DSS,
the ordinary writer must actually create in the shared namespace, and unsafe
controls must fail for the intended reason. Unknown evidence stays unknown.
Each implementation packet needs its full quality/build/CI and owner acceptance.
This design does not authorize steps 2–5, new dependencies, repair of existing
ACLs/ownership, data adoption, API/Worker changes or activation. DEBT-037, D7,
the later stack audit and Phase11 remain open.
