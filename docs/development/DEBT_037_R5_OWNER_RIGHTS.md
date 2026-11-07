# DEBT-037 R5 — Inactive directory owner/right core

Owner authorized implementation from accepted PR136 / main `0c161bbc`.
This packet implements the private directory-rights part of the
[owner/right design](DEBT_037_OWNER_RIGHTS_POLICY_DESIGN.md). Verification is
in progress; packet acceptance and merge have not been requested.

## Scope and fixed contracts

`inspectRoleRights(securityChainCapability, fixedRole)` is a private native
diagnostic, outside the public storage exports. Four exact roles are accepted:
`ancestor`, `shared-namespace`, `protected-parent`, `private-control`. Every
preceding captured component is evaluated as an ancestor. No caller-supplied
trust assertion, mask, trustee, token or filesystem qualification is accepted.

Separate checks report owner model, actual service access, ACL metadata,
conservative grant model, inheritance and actual parent deletion effects.
States are `satisfied`, `violated`, `unavailable`, `unsupported`, with fixed
reasons and numeric errors. Raw paths, descriptors, ACLs and OS identities stay
native. Results always retain `admitted:false`, `filesystemQualified:false`,
`atomic:false`, and explicit identity-domain, filesystem/transition,
creation-protocol and hostile-operation qualifications.

These directory checks request traversal for ancestors; traversal and child
creation for shared/protected parents; private directory listing, child
creation and cleanup for private control. Windows also requests security and
attribute read access; private control requests DELETE_CHILD. POSIX uses
effective X, WX and RWX respectively. File payload access, publication, deletion
and captured cleanup still require their later operation-specific contracts.

## Execution context and platform readers

Context is captured before enqueue and compared in the actual async worker,
before object reads and after collection. Evidence is fresh and non-atomic.
Accepted work owns chain/context resources through completion after JS close.

- Windows refuses active caller/worker impersonation; only ERROR_NO_TOKEN
  selects the process context. A private duplicated token, SID/authentication/
  modification fingerprint and descriptor-bound AccessCheck establish the
  service result. Owner, group and DACL are fetched for AccessCheck; the group
  is never reclassified as trusted. API failure and completed denial differ.
  All applicable allow grants are bounded separately, with no deny credit.
  Unknown ACEs, rights and CREATOR/OWNER forms remain unsupported. Empty and
  null DACLs are different controls. Old handles remain a separate obligation.
- Linux checks real/effective/saved/filesystem credentials and groups against
  actual procfs thread metadata, then uses faccessat2 with effective credentials
  and AT_EMPTY_PATH. There is no ACL-blind wrapper or reconstructed target path
  fallback. Access/default xattrs are bounded and validated. ENODATA remains
  unavailable ACL evidence; a separately labelled mode-class bound is conditional
  on qualified POSIX ACL semantics. Other query failures are not mode fallbacks.
- Darwin refuses per-thread overrides, uses descriptor-relative faccessat with
  AT_EACCESS, and acquires returned extended-security attributes. SDK header,
  count, extent and entry masks are validated before public native ACL import.
  An omitted attribute stays unresolved. The model unions mode and applicable
  allow grants, including inherited rights; it never subtracts deny entries.

Exact service ownership is required for descendants. POSIX root and Windows
LocalSystem/Administrators are conditional administrator candidates only for
ancestors. All other principals/groups remain untrusted. Sticky exceptions are
conditional model rules, not relocation or historical-handle certificates.

## Verification obligations

Local native tests cover the fixed API, bounded projection, real object reads,
closure/in-flight ownership, fresh reads, pure model negatives, genuine OS
query failures and context controls. Darwin additionally exercises synthetic
malformed/truncated/oversized native decoder inputs separately from OS errors.
All existing R1–R4 tests remain required.

The new opt-in hosted-CI proof runs actual ordinary service/attacker Node
processes with ready/go barriers. Windows creates two invocation-owned ordinary
accounts and uses verified primary-token processes. POSIX uses runner/nobody,
drops groups/credentials before exec and checks failed root regain. Code is
read-only to both actors; fixtures are fresh and retained for VM teardown.
No account creation, elevation or privileged proof runs on the developer PC.

Required controls include usable protected/private fixtures, actual service
creation, attacker private/protected denial and shared creation, foreign owner,
dangerous/inherited grants, service denial and parent deletion. Darwin/Windows
include deny/allow conservatism; Windows includes held-capability empty/null
DACL distinction. These tests do not claim operation containment or revocation
of historical capabilities.

## Remaining gates

No API/Worker path, Prisma data, existing uploads ACL, frontend, dependency or
public package export is changed. Filesystem/identity-domain qualification,
complete admitted root, hostile operations, deployment adoption and joint
API/Worker activation remain open. DEBT-037 and D7 are not closed by R5.

Final local/CI measurements and failed attempts will be appended before packet
acceptance; implementation authorization is not acceptance of unverified code.

## Initial verification record

Head `92e085d`: Linux native41/41, existing POSIX7/7 and ordinary actor12/12
controls passed. Darwin native41/41 and existing POSIX6/6 passed; its new actor
controller failed before returning records. Its arena used the runner's default
temporary namespace; the correction selects a fresh arena below shared `/tmp`
and adds bounded controller stages instead of assuming arbitrary ancestors are
accessible to nobody. This is harness work, not a changed ACL permission rule.

Windows native40/41 identified an incorrect test assumption: an elevated token
may create a directory owned by Administrators. The assertion now checks its
actual owner independently; descendant-owner policy remains strict, with exact
ordinary service ownership still required by the actor proof. The new native
suite also needed the same explicit Vitest exclusion as the other three native
suites: it remains mandatory in native:verify, full gate and native CI. Initial
local full gate and CI coverage failed on that runner-discovery error; their
reports remain preserved, with no claim of a full pass.

Additional controls bound R5 to1024 captured components, exercise Node Worker
teardown, refuse local privileged-harness execution and test malformed Linux ACL
wire shapes separately from real OS query errors. Current local native43/43 and
portable storage43/43 pass after these corrections. Final CI is still pending.

At `c85be28`, Linux and Darwin actor artifacts are complete: respectively12/12
and14/14 controls, two actual ordinary processes each. JSON SHA256:
Linux `1EF111D9384AB2D31DE10E4734308832DE986CC8738AEB99985B8B11292314B0`;
Darwin `C1CBCC8562F5D9942D52B29534F78FA918E3FA1D86D9F41E2FCFFD12E406894C`.
Those records do not establish Windows success or complete R5 acceptance.

Windows direct-token launch attempts created a verified-SID process but never
reached READY. Neither NETWORK-token reuse nor a subsequent interactive/profile
attempt proved JS startup; no exact loader cause is claimed. The candidate now
uses the framework credential/profile/stdio API and the installed pinned Node
binary, verifies the actual child's SID, primary token type and lack of
elevation, and drains only bounded diagnostic categories. Passwords remain
SecureString data, absent from argv/logs. Temporary account profiles, like fresh
fixtures, are confined to disposable CI and retained only until VM teardown;
invocation-owned accounts are still removed. The current-user bootstrap
preflight is separate from the mandatory distinct-user proof. Socket/readline
errors are explicitly observed across both emitters; a failed connection must
reach bounded diagnostics rather than an unhandled event.
