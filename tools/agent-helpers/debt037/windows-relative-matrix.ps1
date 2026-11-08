#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: Storage Identity Characterization
📄 File: tools/agent-helpers/debt037/windows-relative-matrix.ps1

🎯 Purpose:
Measures sharing, historical access and captured-parent lookup in disposable CI.

🧠 Responsibilities:
• records a finite access/sharing/order/ACL matrix through admitted logon tokens;
• requires real positive and missing-child controls;
• disposes per-case handles without traversing synthetic junctions.

🏗️ Architecture:
Diagnostic child of windows-identity-proof.ps1; no runtime application imports.

⚠️ Important:
Observations are not production admission, containment or platform certification.

🚀 Build. Share. Grow.
===============================================================
#>
param(
    [Parameter(Mandatory)][Microsoft.Win32.SafeHandles.SafeAccessTokenHandle]$ServiceToken,
    [Parameter(Mandatory)][Microsoft.Win32.SafeHandles.SafeAccessTokenHandle]$AttackerToken,
    [Parameter(Mandatory)][string]$Arena,
    [Parameter(Mandatory)][string]$Stage,
    [Parameter(Mandatory)][string]$SafeAcl,
    [Parameter(Mandatory)][string]$UnsafeAcl
)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows -or $env:GITHUB_ACTIONS -cne 'true' -or
    $env:RUNNER_ENVIRONMENT -cne 'github-hosted' -or
    $env:DSS_DISPOSABLE_WINDOWS_IDENTITY_PROBE -cne '1') {
    throw 'Requires admitted disposable Windows identity fixture.'
}
function Open-Observed($Token, [string]$Path, [uint32]$Access, [uint32]$Share) {
    try {
        return @{ Handle = [Dss037IdentityNative]::Open($Token, $Path, $Access, $Share); Error = 0 }
    } catch {
        $cause = $_.Exception
        while ($null -ne $cause.InnerException) { $cause = $cause.InnerException }
        if ($cause -isnot [ComponentModel.Win32Exception]) { throw }
        return @{ Handle = $null; Error = $cause.NativeErrorCode }
    }
}
$rows = [Collections.Generic.List[object]]::new()
$baseline = [Dss037IdentityNative]::Open($ServiceToken, $Stage, 0x100081, 3)
try {
    $control = [Dss037IdentityNative]::RelativeRead($ServiceToken, $baseline, 'secret.txt', 'SYNTHETIC PRIVATE STAGE')
    if ($control.NtStatusHex -cne '0x00000000' -or $control.ReadWin32Error -ne 0 -or -not $control.SentinelMatched) {
        throw 'Real relative-read positive control failed.'
    }
} finally { $baseline.Dispose() }
foreach ($access in @(0x100, 0x2, 0x102)) {
    foreach ($share in @(1, 3)) {
        foreach ($order in @('service-first', 'attacker-first')) {
            foreach ($policy in @('unsafe-current', 'revoked-after-open')) {
                $path = [IO.Path]::Combine($Arena, 'matrix-' + $rows.Count)
                if ([IO.Directory]::Exists($path) -or [IO.File]::Exists($path)) { throw 'Matrix fixture collision.' }
                [Security.Principal.WindowsIdentity]::RunImpersonated($ServiceToken, [Action]{
                    [IO.Directory]::CreateDirectory($path) | Out-Null
                })
                [Dss037IdentityNative]::Descriptor($path, $UnsafeAcl)
                $service = $null
                $attacker = $null
                try {
                    if ($order -ceq 'service-first') {
                        $service = Open-Observed $ServiceToken $path 0x100081 $share
                        $attacker = Open-Observed $AttackerToken $path $access 3
                    } else {
                        $attacker = Open-Observed $AttackerToken $path $access 3
                        $service = Open-Observed $ServiceToken $path 0x100081 $share
                    }
                    # First open on a fresh trusted fixture is a required positive control.
                    if (($order -ceq 'service-first' -and $service.Error -ne 0) -or
                        ($order -ceq 'attacker-first' -and $attacker.Error -ne 0)) {
                        throw 'First-open fixture positive control failed.'
                    }
                    $before = $null
                    if ($null -ne $service.Handle) {
                        $before = [Dss037IdentityNative]::RelativeRead($ServiceToken, $service.Handle, 'secret.txt', 'SYNTHETIC PRIVATE STAGE')
                        if ($before.NtStatusHex -cne '0xC0000034') { throw 'Fresh empty-parent missing-child control failed.' }
                    }
                    $newOpen = $null
                    if ($policy -ceq 'revoked-after-open') {
                        [Dss037IdentityNative]::Descriptor($path, $SafeAcl)
                        $newOpen = [Dss037IdentityNative]::OpenOutcome($AttackerToken, $path, $access)
                        # FILE_WRITE_DATA on a directory is FILE_ADD_FILE, allowed by safe policy.
                        if ($access -ne 0x2 -and $newOpen -ne 5) { throw 'Revoked metadata new-open was not denied.' }
                    }
                    $junction = $null
                    if ($null -ne $attacker.Handle) {
                        $junction = [Dss037IdentityNative]::Junction($AttackerToken, $attacker.Handle, $Stage)
                    }
                    $tag = $null
                    $after = $null
                    if ($null -ne $service.Handle) {
                        $tag = [Dss037IdentityNative]::Tag($service.Handle)
                        if ($junction -eq 0 -and $tag -ne [uint32]2684354563) { throw 'Successful junction lacks captured mount-point tag.' }
                        $after = [Dss037IdentityNative]::RelativeRead($ServiceToken, $service.Handle, 'secret.txt', 'SYNTHETIC PRIVATE STAGE')
                        if ($after.NtStatusHex -ceq '0x00000000' -and
                            ($after.ReadWin32Error -ne 0 -or -not $after.SentinelMatched)) {
                            throw 'Successful relative open did not read the exact synthetic sentinel.'
                        }
                    }
                    $rows.Add([ordered]@{
                        access = ('0x{0:x}' -f $access); serviceShare = $share; order = $order; policy = $policy
                        serviceOpenWin32 = $service.Error; attackerOpenWin32 = $attacker.Error
                        newOpenWin32 = $newOpen; junctionWin32 = $junction; capturedTag = $tag
                        before = $before; after = $after
                        relativeReadRun = ($null -ne $service.Handle)
                        junctionRun = ($null -ne $attacker.Handle)
                    })
                } finally {
                    if ($null -ne $service -and $null -ne $service.Handle) { $service.Handle.Dispose() }
                    if ($null -ne $attacker -and $null -ne $attacker.Handle) { $attacker.Handle.Dispose() }
                }
            }
        }
    }
}
if ($rows.Count -ne 24) { throw 'Incomplete finite matrix.' }
if ([IO.File]::ReadAllText([IO.Path]::Combine($Stage, 'secret.txt')) -cne 'SYNTHETIC PRIVATE STAGE') {
    throw 'Private sentinel changed.'
}
[ordered]@{
    kind = 'real local logons; synchronous impersonation, not independent processes'
    relativePositiveControl = $control; cases = $rows.ToArray(); caseCount = $rows.Count
    privateBytesUnchanged = $true; productionContainmentProved = $false
} | ConvertTo-Json -Depth 10

# A handle remembers its rights. It does not read our latest architecture document.
