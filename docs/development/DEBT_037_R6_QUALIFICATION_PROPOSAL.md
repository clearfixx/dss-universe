# DEBT-037 R6 — Qualification evidence proposal

Baseline: accepted R5 / [PR138](https://github.com/clearfixx/dss-universe/pull/138),
main `1ebfa674be7320586f3069564fe56c8507431587`. This packet defines the next
decision and characterizes the existing implementation. It adds no native API,
qualification verdict, privileged harness or application activation.

## What R5 proves and what the next decision must settle

R5's service-access and conservative grant checks are conditional models. They
cannot establish the filesystem's identity interpretation, security semantics
or the publication relationship. A matching volume/device ID and an OS family
name do not fill those gaps. See the accepted
[owner/right policy](DEBT_037_OWNER_RIGHTS_POLICY_DESIGN.md).

The next proposed packet is a **test-only native qualification probe**, not a
production policy implementation. Its result must answer whether supported,
descriptor-bound queries can distinguish the ordinary usable deployment from
identity-mapped, ownership-disabled or unqualified transition controls under
the actual ordinary service identity. Success as an elevated controller cannot
substitute for the service result. A failed query cannot mean the property is
absent. No higher privilege or new package is required of DSS itself.

Candidate positive fixtures are local NTFS on Windows, local ownership-enabled
APFS on macOS, and a local POSIX-ACL-capable Linux filesystem with known mount
and identity semantics. These are proof targets, **not a production allowlist**.
The Linux `ext` family label does not identify an ext version. The probe must
record actual SDK/kernel feature availability before selecting a query route.
All three supported OS families remain in the acceptance matrix.

## Proposed native query routes

| Platform | Descriptor/handle-bound candidate evidence                                                                                                   | What must remain unresolved until measured                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Windows  | Existing file identity/volume queries plus a supported handle-bound local/remote and device-characteristics query                            | Volume serial is not mount identity; local NTFS does not revoke historical handles or prove the publication transition                                 |
| Linux    | Actual worker user/mount namespace context; returned-field-aware mount queries tied to the retained descriptor and its unique mount identity | Caller mapping, mount idmapping and filesystem mapping are distinct; missing fields and permission errors cannot prove an ordinary unmapped deployment |
| Darwin   | Existing `fstatfs` plus actual ownership/extended-security support and returned-attribute evidence                                           | Local/APFS does not imply ownership enforcement; missing ACL evidence and device/fsid disagreement retain their existing meaning                       |

Windows route selection must first establish the installed user-mode SDK/API
contract. Microsoft's volume-query contract supplies completion status and
returned byte length; the device-information class supplies device properties.
A kernel-driver declaration alone does not establish a callable user-mode
prototype. Do not invent numeric classes/struct layouts, treat a failed remote
protocol query as proof of locality, or require a drive-letter path fallback.
Use the existing toolchain; an unavailable public SDK definition is an explicit
gate for route review, not authorization to install a WDK.

Linux must distinguish the observed kernel contract from current upstream
headers. `statmount` has feature-dependent request/response fields; its returned
mask controls validity. A proposed direct-FD route is usable only when both the
installed SDK and runtime support it. An older route would have to bind its
unique mount ID to the held object and prove that relationship in the actual
namespace. No legacy mount-ID, device equality, `/proc` pathname or zero-filled
field fallback may certify the missing relationship. Test actual ordinary-user
permissions rather than deriving availability from controller success.

UID/GID maps are not a cheap absence test: unavailable fields, an unresolved
mapping and a genuinely unmapped mount are distinct states. Request only the
necessary fields with explicit size bounds. Do not copy upstream parsing code
or assume the syscall semantics from the build headers. An `NS_GET_PARENT`
permission failure alone cannot prove the initial host user namespace. Exact
host/domain qualification remains open unless the probe supplies an independent
supported contract; a caller-provided `trustedHost:true` cannot supply it.

Darwin's public mount flags include ownership-ignored and snapshot states that
R3 does not project. A new probe must check actual installed definitions and
read the captured object's flags. A successful local flag does not erase these
conditions. The usable control must establish the required ownership/ACL facts;
the ownership-disabled control must fail the relevant premise. Do not rewrite
ACLs merely to turn omitted extended-security evidence into an empty ACL.

## Concrete proof matrix and privilege boundary

The proposed standalone executable stays outside the addon and public storage
exports. OS-specific acquisition and common bounded result types stay separate.
It returns fixed categories, feature availability, numeric error codes and
nullable relations; raw paths, IDs, mappings, tokens and ACL bytes stay private.
Every record retains `admitted:false` and `filesystemQualified:false`.

1. A normal, writable positive fixture on each OS. The ordinary service queries
   its held object and successfully performs the required synthetic operation.
2. Independent captures of the same object, a distinct sibling, and an actual
   separate-volume/mount fixture. Equality remains scoped to the exact query;
   neither same-device nor same-filesystem is silently promoted to same-mount.
3. Linux same-filesystem bind aliases and an idmapped fixture: measure the
   expected distinction under ordinary service credentials. If fixture creation
   or required fields are unavailable, report that gate as unproved, not passed.
4. Darwin an isolated disposable image with ownership enabled versus disabled;
   compare actual service queries and a real distinct ordinary actor. Image
   support/tools must already exist. No developer volume setting is changed.
5. Windows locality/device queries and actual junction/transition controls with
   the retained object. A remote/removable control needs an actual fixture or
   remains unproved; fabricated flags test the decoder only. Existing hostile
   historical-handle counterexamples remain mandatory later operation gates.
6. Genuine invalid/closed-resource errors and separately labelled malformed/
   truncated/oversized decoder tests, all fixed bounds, release on failure and
   async-context consistency. Never pass a malformed buffer to an OS importer.

All actor, mount, namespace and image provisioning requires **separate owner
authorization** for the new test-only probe/harness. Only guarded disposable
hosted CI may perform it; no developer elevation, local accounts, mount changes
or upload ACL repair. Reuse accepted ordinary-actor launch mechanisms, preserve
actual service identity checks, use deterministic barriers and retain failures.
The new proof must not increase timeouts or weaken R1–R5/quality checks.

## What follows a successful probe

Select a concrete supported profile only after its positive and negative
evidence is reviewed. If a route fails, document the exact unresolved premise
and revise that route; do not qualify all local filesystems or reject every
legitimate deployment as a shortcut. Production policy, admitted-root lifecycle,
creation/publication/delete/cleanup and hostile schedules, adoption and joint
API/Worker activation remain separate implementation/acceptance gates.

The complete DEBT-037 is still a pre-Phase11 requirement. This packet does not
close it, D7, the stack audit, or authorize Phase11. Frontend is unchanged.

## Existing-boundary characterization

`tools/agent-helpers/debt037/r6/observe-existing-boundary.mjs` uses accepted
private R3/R5 operations only. After a native rebuild, it creates a fresh fixture
in the workspace cache, checks independent same-object captures, records bounded
leaf facts and outstanding qualifications, closes both capabilities and verifies
closed-resource refusal. It takes no target path, does not change permissions,
does not claim a second OS actor, and retains its synthetic fixture. Its record
includes the source head and actual binary digest; no report alone proves that
the binary was rebuilt from that source. Build receipts supply that evidence.

Measurements and final package gate/CI receipts belong to this packet's PR.
The helper cannot supply the new native qualification evidence proposed above.

Initial local Windows characterization after a fresh native rebuild passed
all checks; the unchanged native suite passed43/43 without skips/todo. Two
independent captures compare as the same object and filesystem. The volume
reports NTFS and persistent ACL support, but mount identity stays unsupported
(OS code50), local/remote stays null and sameMount stays null. All four R5
qualifications remain required. The ordinary inherited cache-fixture ACL fails
the conservative private grant/inheritance models; the helper records that
result without repairing permissions or calling the fixture an admitted private
control. No actual attacker process is involved in this characterization.

CI runs this same current-user helper immediately after the native rebuild on
all three OS families and preserves one bounded JSON artifact per platform.
This extends evidence collection only; no new privileged provisioning step is
introduced. Its exact-head results are prerequisites for accepting this packet,
not a substitute for authorizing or completing the proposed native probe.

## Primary sources reviewed on 2026-11-07

- [Microsoft volume query contract](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ntqueryvolumeinformationfile)
  and [handle query classes](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex).
- [Linux statmount contract](https://man7.org/linux/man-pages/man2/statmount.2.html),
  [current UAPI](https://github.com/torvalds/linux/blob/master/include/uapi/linux/mount.h),
  [current implementation](https://github.com/torvalds/linux/blob/master/fs/namespace.c),
  [identity mapping model](https://docs.kernel.org/filesystems/idmappings.html) and
  [namespace ioctl errors](https://man7.org/linux/man-pages/man2/ioctl_ns.2.html).
- [Apple public mount flags](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/mount.h).

These are reviewed upstream references, not pins of any installed CI kernel or
SDK. Record installed definitions and pin any source implementation relied on
by the future probe before claiming its contract. The proposed architecture and
proof requirements above are DSS design inferences, not upstream guarantees.
