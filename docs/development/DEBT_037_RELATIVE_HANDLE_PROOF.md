# DEBT-037 — Windows access/sharing and relative lookup proof

## Approved boundary

Starts from accepted main `ec19a32` (PR119). The owner approved a separate
disposable Windows CI proof, not runtime activation or root admission. Existing
two-account provisioning, actual SID checks, private-stage denial, historical
handle control and exact-account cleanup remain mandatory. No application,
frontend, uploads ACL, data migration or OS configuration is changed.

## Finite experiment

The admitted identity helper invokes `windows-relative-matrix.ps1` before
disposing its two real logon tokens. A separate fresh, initially empty parent is
used for each of24 combinations:

- Attacker access: `0x100` (WRITE_ATTRIBUTES), `0x2` (WRITE_DATA on files,
  FILE_ADD_FILE on directories), or `0x102` (combined).
- Service sharing: READ or READ|WRITE, neither allowing DELETE.
- Open order: service first or attacker first.
- Policy: unsafe ACL retained or safe ACL installed after both open attempts.

The service requests LIST_DIRECTORY|READ_ATTRIBUTES|SYNCHRONIZE, matching P1
OpenRoot's effective access; the attacker always shares READ|WRITE. Both are
real ordinary account tokens in synchronous impersonation, not separate
processes. Initial handle grants in this experiment use an intentionally unsafe
fixture ACL. They are not a certification of legacy-root adoption.

A first-open failure on a fresh fixture fails the proof. A second-open sharing
or access failure is recorded exactly, not silently changed to another sharing
mode. When there is no captured service handle, relative IO is explicitly marked
unrun. When there is no attacker handle, the junction operation is unrun. These
are measured admission outcomes, not skipped test cases or successful
containment assertions. Every combination must be reported.

Before mutation, the captured parent must report NAME_NOT_FOUND for the absent
synthetic child. A trusted private-stage parent must successfully read the exact
synthetic sentinel through the same relative-read interop. This positive control
prevents a broken native reader from masquerading as containment.

The attacker attempts FSCTL_SET_REPARSE_POINT against its existing handle. If
successful, a captured service handle must observe the mount-point tag. The
service then attempts to open/read `secret.txt` relative to that handle using
the same access, case and CreateOptions flags as P1 OpenFile. Raw NTSTATUS,
mapped Win32 open error, read error, byte count and exact-sentinel-match flag are
recorded. File contents are never emitted. Success with any other bytes fails
the fixture. Failed native operations remain observations; no safe adapter is
selected from a negative result alone.

Safe policy permits FILE_ADD_FILE, so a fresh `0x2` open need not be denied after
the ACL change. Metadata-bearing fresh opens must be denied. This distinguishes
directory child creation from modification of the parent's metadata rather
than treating the FILE_WRITE_DATA constant name as its directory semantics.

## Resource and security limits

The relative native call keeps a reference to the captured parent, owns the
child handle, frees both native name allocations and clears its bounded read
buffer. Handles are disposed per case even after failure. Synthetic junction
fixtures remain for disposable runner teardown; no recursive traversal/removal.
The private sentinel must remain byte-for-byte unchanged. Production containment
is explicitly false, regardless of observed outcomes.

This matrix does not prove publication, conditional deletion, complete ancestor
or mount admission, physical identity locking, cross-process token behavior or
Linux/macOS policy. New native code here is diagnostic interop only, not a
change to the production storage interface. Existing native three-OS gates and
the complete quality gate remain required. Final CI/local evidence and owner
acceptance are pending; DEBT-037/D7 remain open.

## First measured Windows result

Exact head `fb8274c`, Storage security run
[42144199629, Windows job127651624225](https://github.com/clearfixx/dss-universe/actions/runs/42144199629/job/127651624225),
reported all24 cases. This is one runner observation with real logon tokens;
no independent-process or filesystem qualification claim is added.

| Measured group                                            | Observations                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| WRITE_ATTRIBUTES only, both sharing modes/orders/policies | All8 junction attempts succeed; captured tag is mount point                                            |
| ADD_FILE or combined access, service sharing READ         | All4 service-first cases deny attacker open with32; all4 attacker-first cases deny service open with32 |
| ADD_FILE or combined access, service sharing READ\|WRITE  | All8 pairs open and junction attempts succeed                                                          |
| Reparsed parents with a captured service handle           | All16 relative opens fail with NTSTATUS `0xC0000280`, mapped Win32 `1921`; no bytes read               |
| Captured parents where attacker open was denied           | All4 retain absent-child result `0xC0000034` / Win32 `2`                                               |
| Attacker-first cases denying service capture              | All4 record no captured handle and no relative-read attempt                                            |

The trusted positive control reads23 bytes and matches the exact synthetic
sentinel. The sentinel is unchanged afterward; attacker private-stage access
remains denied. Across the matrix,20 junction operations succeed,4 attacker
opens are denied and4 service opens are denied. These overlap by case; they
must not be added together as independent test counts.

Fresh metadata-bearing opens after ACL revocation return5. Fresh ADD_FILE-only
opens remain permitted unless incompatible sharing returns32. Consequently,
the fixture's safe ACL cannot by itself exclude every handle capable of setting
a directory junction: permitting directory child creation grants a relevant
right too. This is a finding about the synthetic fixture policy, not a newly
demonstrated exploit against production storage.

Microsoft identifies `0xC0000280` as
[STATUS_REPARSE_POINT_NOT_RESOLVED](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-erref/596a1078-e883-4972-9bbc-49e60bebca55).
The observed relative-open refusal is a candidate property to preserve in a
later mechanism. It does not prove that reparse mutation is prevented, nor that
publication, rename, cleanup, concurrent schedules or another filesystem behave
equivalently. Do not select a production adapter or weaken legacy-root handling
from this single read experiment.

The local full gate completed with exit0 on `fb8274c`,
2026-11-06T01:29:43Z–01:44:47Z: coverage8/8 (API1466/1466), E2E688/688 across64
suites with no failures/skips/todo, build6/6, GraphQL/compiled API and Web15/15
with retries0. Start/end HEAD match. Only this report changed during the run;
runtime, proof helpers, tests and configuration are identical. The local API
JSON SHA256 is `0CE8000EFB718FBA33A3C3A43D744817615D8DC2E3E1826BB92E46A27EA958ED`.

Initial-head CI is8/8 green. Its API artifact13469373783 also reports688/688
without skips/todo (JSON SHA256
`291E0CC8CC53065AF59AD8A10A6EB2374B90F2CF5010F57245B7FA82FE11CB14`).
The final report-only commit still requires exact-head CI and owner acceptance;
neither is inferred from initial-head success. DEBT-037/D7 remain open.

## Primary references

- [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)
  documents sharing compatibility and the attribute-access exception.
- [NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile)
  documents RootDirectory-relative lookup and directory access meanings.

These documents motivate the experiment; they do not substitute for observed
kernel/filesystem results under the fixture identities.
