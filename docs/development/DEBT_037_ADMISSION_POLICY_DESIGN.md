# DEBT-037 — Admission policy and remaining native decisions

Baseline: main `64c767e`, accepted R2 / PR131. This is a concrete design for
review, not a runtime implementation, activation or certificate of containment.
It supplements the [complete boundary](DEBT_037_RUNTIME_BOUNDARY_DESIGN.md).
The separate OS-user writer remains able to create entries in the shared uploads
namespace. Removing that writer, trusting every local process or dropping a
supported OS is not an alternative acceptance criterion.

## Decision ownership and inputs

The storage infrastructure owns policy evaluation over captured native objects.
It must not evaluate the public R2 JSON as if it were a complete security model.
That projection deliberately omits trustee identities, rights and mount facts.
Internal native readers may retain those facts for a single evaluation; they
must not expose them through application ports, jobs, DTOs or logs.

Proposed fixed roles are `ancestor`, `shared-namespace`, `protected-parent` and
`private-control`. Callers do not supply arbitrary allow masks or an attacker
username. The policy must bound all untrusted principals, not only demonstrate
that one configured test user cannot write. Actual service access is a separate
positive obligation. API and Worker must use the same admitted deployment
identity and protocol; a deliberate distinct-service-identity topology needs
its own reviewed policy rather than implicit group membership trust.

Candidate owner policy, requiring review before implementation:

- private control, prepared files and DSS-owned descendants belong to the exact
  service principal; a writable directory owned by another ordinary user fails;
- trusted OS ancestors may belong to the service or a qualified OS administrator
  identity; POSIX root and Windows SYSTEM/Administrators are explicit candidates,
  not a rule that every group in the service token is trusted;
- POSIX group names, Windows display names, path spellings and website roles are
  never identity or ownership evidence;
- administrator/kernel and same-service-token attacks remain outside the agreed
  model, but an ordinary user holding an old handle remains inside it.

Windows R2's ownerIsSystem means LocalSystem, not Administrators. A false result
does not prove an owner is untrusted; a true result does not prove the DACL is
safe. POSIX ownerMatchesProcess similarly proves only an equality comparison.

## Separate proof obligations

| Obligation         | Required evidence                                              | Current R1/R2 limit                                 |
| ------------------ | -------------------------------------------------------------- | --------------------------------------------------- |
| Bound object       | Retained no-follow chain and actual type                       | Implemented, not a relocation guarantee             |
| Trusted owner      | Exact internal principal classification                        | Only two public comparisons exist                   |
| Service operation  | Required access for the actual service context                 | Successful capture proves only its requested access |
| Untrusted mutation | Conservative bound over every untrusted grant and parent right | ACL counts/flags cannot supply it                   |
| Inheritance        | Security of newly created objects before use                   | A default/inherited ACL flag is only an observation |
| Mount/filesystem   | Captured-object identity and qualified mount semantics         | Not collected by R2                                 |
| Mutation safety    | Operation-specific hostile scheduling proof                    | Historical Windows handles remain relevant          |

These obligations are conjunctive. Missing evidence produces a typed refusal;
it does not downgrade to the lexical implementation or a pathname recheck.
No complete admitted-root capability exists until all obligations are satisfied.

## Rights policy by role

`ancestor` must protect the next DSS-owned component from replacement or
relocation by an ordinary writer. Check the parent's namespace rights, not only
the child's mode/DACL. A retained descriptor does not make a movable directory
stay under the configured tree. A trusted sticky parent is a candidate POSIX
exception only after the service-owned child and real separate-user schedule
have been proved. The flag by itself is insufficient.

`private-control` and `protected-parent` must exclude untrusted mutation of both
the namespace and security metadata. Control additionally excludes untrusted
payload reads and writes. A legitimate service operation must still succeed;
an empty Windows DACL is not a usable protected directory merely because it
denies ordinary access. New synthetic fixtures may be provisioned explicitly;
existing deployment objects are never chmod/chown/ACL-repaired by admission.

`shared-namespace` deliberately permits the agreed writer to create entries.
Attacker-owned collisions are refused, not adopted or overwritten to make a
test succeed. DSS-owned descendants and publication still need protection.
For POSIX, the service-owned sticky-root topology remains a candidate. For
Windows, permitting directory ADD_FILE is already known to permit a relevant
junction mutation in the PR128 fixture. That permission cannot be classified
as harmless ordinary file content writing. Every operation must tolerate or
refuse that mutation using its captured-object primitive.

## Effective access and conservative bounds

Windows: an actual token-based AccessCheck with explicit file/directory generic
mapping is a candidate service-access check, not proof about every other token.
GetEffectiveRightsFromAcl is not an equivalent shortcut: its documented limits
include implicit owner rights, privileges, logon groups and parent-provided
rights. A separate conservative mutation bound must inspect owner rights, all
applicable allow grants, expanded generic masks, inheritance and parent DELETE
or DELETE_CHILD effects. It may refuse a complex ACL rather than implement a
general Windows authorization engine. Unsupported conditional/object-specific
ACE forms cannot be discarded. A deny ACE must not be used to justify ignoring
an otherwise dangerous grant unless the exact interaction is proved.

POSIX: owner, group/mask, named users/groups and other permissions have different
precedence. Supplementary groups matter for a concrete service check. A future
policy may use a proved conservative bound instead of enumerating every local
account, but must account for extended/default ACLs and metadata ownership.
Darwin extended ACLs are not Linux POSIX ACLs; neither implementation may borrow
the other's absence or evaluation conventions.

No current decision converts Linux ENODATA or Darwin NULL/ENOENT into verified
absence. Both were observed in R2 CI and remain unavailable evidence. Before
complete admission, the native contract must either establish a supported
descriptor-bound absence proof or prove a sufficient conservative bound with
explicit filesystem semantics. A source-code hypothesis or one successful
fixture alone is not a portable absence contract. This is an unresolved gate,
not an implementation detail to be silently chosen later.

Current ACLs do not revoke previously opened Windows capabilities. Admission
must retain the PR119/128 counterexamples as negative controls. The root cannot
be labelled safe solely because a new attacker open is denied.

## Mount and identity contract

Capture object and mount facts through held handles/descriptors. Externally
return only bounded states or opaque capabilities. Keep raw file IDs, fsids,
volume serials, device IDs and mount IDs private. A filesystem name, MNT_LOCAL
flag or persistent-ACL support flag is an observation, not qualification.

Linux candidate: descriptor-bound statx with AT_EMPTY_PATH, checking returned
masks, plus filesystem observations. A device/inode pair alone does not identify
the mount. Distinguish a mount ID's scope/lifetime from a persistent deployment
identity; STATX_MNT_ID_UNIQUE availability cannot be assumed on every kernel.
Missing fields must remain unavailable rather than silently replaced with zero.

Windows candidate: handle-bound volume/filesystem information and file identity;
the persistent-ACL flag is necessary evidence, not proof of all NTFS operations.
Reparse/mount transitions and source/destination volume relationships require
actual checks. Darwin candidate: descriptor-bound filesystem/volume attributes,
returned-attribute validation and qualified native identity encoding. A missing
security attribute is not automatically a verified empty ACL.

Do not require every ancestor from the OS anchor to share one mount: legitimate
deployments can have a separate storage volume. Instead qualify each traversed
boundary and prohibit unqualified transitions inside the admitted data/control
region. Staging and destination must meet the same-filesystem publication
contract. Bind mounts, snapshots, network/overlay filesystems and removable
volumes remain explicitly unqualified until their particular obligations pass;
the supported OS list is unchanged. No production filesystem allowlist is
selected by this document.

## Concrete implementation sequence and acceptance

Current checkpoint: R3/PR133 and R4/PR135 are accepted; main `6ae392f` retains
inactive observations and the POSIX proof, not an admitted root. The concrete
[owner/right and filesystem design](DEBT_037_OWNER_RIGHTS_POLICY_DESIGN.md)
refines the remaining decisions below. Its own review does not authorize runtime.

1. Add inactive descriptor-bound identity/mount observations and explicit field
   availability, with real three-platform fixtures and lifecycle tests. Do not
   return an admitted capability or change R1/R2 semantics. This is the next
   bounded runtime proposal, requiring separate owner authorization.
2. Resolve the ACL absence/bounding gate and implement the reviewed owner/right
   predicates internally. Keep service access separate from untrusted mutation.
   Include actual parent and inheritance rights, not only leaf permissions.
3. Prove each role using two real OS users and deterministic barriers: trusted
   positive layouts, unsafe owner, named/inherited grants, null/empty ACL,
   shared writer creation, protected-child relocation, stale security evidence,
   historical handles, unavailable metadata, same-device mount aliases and
   unsupported filesystems. No account/ACL mutations on the developer's uploads;
   account-requiring controls run only in admitted disposable environments.
4. Combine policy with operation-specific publication/current-delete/captured-
   cleanup proofs before complete root admission. Then follow the accepted
   API/Worker integration and joint-activation gates. No static metadata result
   replaces those proofs.

Each logical packet retains full quality/CI and owner acceptance. The next
observations packet is not authorization for steps2–4, new dependencies,
deployment ACL repair, filesystem migration or activation. No frontend change
is needed. DEBT-037, D7, stack audit and Phase11 remain open.

## Primary sources and evidence

- [R2 accepted PR131](https://github.com/clearfixx/dss-universe/pull/131): native
  28/28 on all three OS families, CI8/8; local full gate exit0, E2E688/688,
  coverage8/8, build6/6, Web15/15 without retries. The local run included
  confirmed Windows sleep13:04:42Z–18:22:36Z on2026-11-06; it was not uninterrupted.
- [R2 scope](DEBT_037_R2_SECURITY_EVIDENCE.md) and
  [Windows hostile-handle evidence](DEBT_037_RELATIVE_HANDLE_PROOF.md).
- [AccessCheck](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-accesscheck)
  and [GetEffectiveRightsFromAcl limits](https://learn.microsoft.com/windows/win32/api/aclapi/nf-aclapi-geteffectiverightsfromacla).
- [Linux ACL evaluation](https://man7.org/linux/man-pages/man5/acl.5.html),
  [rename semantics](https://man7.org/linux/man-pages/man2/rename.2.html) and
  [statx field/mount contract](https://man7.org/linux/man-pages/man2/statx.2.html).
- [Handle-bound Windows volume information](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumeinformationbyhandlew).
- [Apple attribute retrieval](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/getattrlist.2.html)
  and [Apple local-volume observation](https://developer.apple.com/library/archive/qa/nw09/_index.html).

The candidate policy is our design inference from those contracts and retained
experiments. Documentation links are not proof that it has been implemented.
