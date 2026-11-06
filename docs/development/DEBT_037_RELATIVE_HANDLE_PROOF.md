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

## Primary references

- [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)
  documents sharing compatibility and the attribute-access exception.
- [NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile)
  documents RootDirectory-relative lookup and directory access meanings.

These documents motivate the experiment; they do not substitute for observed
kernel/filesystem results under the fixture identities.
