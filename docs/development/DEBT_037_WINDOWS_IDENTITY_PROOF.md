# DEBT-037: Windows real-identity characterization

## Scope

This pending proof extends the accepted coordination protocol with two real local
account logons. It does not activate storage runtime, establish production root
admission, repair existing ACLs or migrate uploads. Frontend files are untouched.

The helper runs only in an explicitly opted-in GitHub-hosted Windows runner with
an elevated fixture controller. It refuses local and self-hosted environments
before compilation, account creation or fixture changes. These environment guards
prevent accidental invocation; they are not a security boundary against someone
who deliberately fabricates the environment and already controls the machine.

## Fixture and claims

Two randomly named ordinary local accounts represent the DSS service and a local
namespace writer. Random passwords remain in SecureString objects, are passed to
LogonUser through zeroed native buffers and never appear in arguments or reports.
NETWORK logons supply real account tokens; synchronous RunImpersonated scopes
verify their distinct SIDs and non-administrator status. This is not a restricted
version of the controller token, nor a claim about two independent processes.

All files and ACL changes are confined to a fresh runner-temp arena. Service
directories are created under its token. The safe ACL grants the attacker child
creation without metadata, delete-child, ownership or DACL rights. Positive
controls require successful file creation and a successful junction operation in
an intentionally unsafe directory while the service holds a non-delete-sharing
metadata handle. Private-stage reads must fail with access denied.

The historical-handle case opens an attacker metadata handle before tightening
the directory ACL. A new equivalent open must then fail with access denied. The
existing handle is used to attempt a mount-point reparse operation; the service's
already-held handle supplies the observed reparse tag. The current executable
expects the concrete successful historical-handle counterexample and fails on
unexpected outcomes. That counterexample was observed in CI as recorded below.

Tokens and file handles are disposed before exact-SID account cleanup. Cleanup
checks the invocation-specific account name and description before removal.
Synthetic filesystem fixtures remain for runner teardown; the helper never
recursively deletes a directory containing junctions.

## Evidence and next decision

Local C# compilation passed. A local invocation was rejected by the disposable
runner guard before side effects. On head `1369b4e`, all three CI workflows
passed. The Windows identity job
[124090091138](https://github.com/clearfixx/dss-universe/actions/runs/41063879632/job/124090091138)
reported distinct service/attacker account SIDs ending in 1003/1004:

| Observation                                           | Actual result                                    |
| ----------------------------------------------------- | ------------------------------------------------ |
| Safe-directory metadata/delete-child/DACL/owner opens | Win32 5 for all five masks                       |
| Private-stage read                                    | Win32 5                                          |
| Unsafe-directory junction control                     | Win32 0                                          |
| New metadata open after ACL revocation                | Win32 5                                          |
| Historical-handle junction after ACL revocation       | Win32 0                                          |
| Captured historical directory tag                     | UInt32 2684354563 (`IO_REPARSE_TAG_MOUNT_POINT`) |
| Private sentinel bytes                                | Unchanged                                        |

These checks do not prove complete admission requirements, owner metadata,
Linux/macOS identity behavior or safe production publication. The helper
explicitly reports `productionContainmentProved: false`.

Earlier CI failures are retained: overlong account description (`de682ec`),
invalid SDDL `RX` rights (`1f95c26`), and signed PowerShell tag comparison
(`ce3bf92`). The last case had a successful native junction operation but a bad
assertion; comparing the same tag bits as UInt32 fixed it without weakening the
expected outcome.

Local gate attempts also remain preserved: port 3195 was rejected because it
lies inside the observed Windows excluded range 3128–3227; the next attempt
lacked an explicit Python interpreter; the following run reached coverage but
terminated with `1073807364` during `test:full`. Its tool process handle is gone
and its log is terminal. The exact external interruption cause is not proven;
this run is not accepted as a passing gate. A final full gate remains required.

The observed counterexample means current DACL inspection cannot establish
that no historical writable handle exists. The next design must address that
history explicitly; it must not silently attest legacy roots or weaken the
agreed separate-OS-user threat model. Runtime implementation remains separate.

Primary references: [LogonUser](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-logonuserw)
and [RunImpersonated](https://learn.microsoft.com/en-us/dotnet/api/system.security.principal.windowsidentity.runimpersonated).
