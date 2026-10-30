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
unexpected outcomes. No such outcome is yet claimed as observed.

Tokens and file handles are disposed before exact-SID account cleanup. Cleanup
checks the invocation-specific account name and description before removal.
Synthetic filesystem fixtures remain for runner teardown; the helper never
recursively deletes a directory containing junctions.

## Evidence and next decision

Local C# compilation passed. A local invocation was rejected by the disposable
runner guard before side effects. Real-account CI execution and the full quality
gate remain pending. These checks do not prove complete admission requirements,
owner metadata, Linux/macOS identity behavior or safe production publication.

If reproduced, the counterexample means current DACL inspection cannot establish
that no historical writable handle exists. The next design must address that
history explicitly; it must not silently attest legacy roots or weaken the
agreed separate-OS-user threat model. Runtime implementation remains separate.

Primary references: [LogonUser](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-logonuserw)
and [RunImpersonated](https://learn.microsoft.com/en-us/dotnet/api/system.security.principal.windowsidentity.runimpersonated).
