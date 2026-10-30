#requires -Version 7.0
<#
DSS Universe — Storage infrastructure characterization
File: tools/agent-helpers/debt037/windows-identity-proof.ps1
Purpose: real-account historical metadata-handle evidence in disposable Windows CI.
Responsibilities: guard provisioning; create isolated identities and fixture ACLs;
dispose tokens/passwords; remove only accounts created by this invocation.
Architecture: opt-in diagnostic helper; never imported by API or Worker.
Important: no host execution, upload migration, production admission or recursive cleanup.
Build. Share. Grow.
#>
$ErrorActionPreference = 'Stop'
if (-not $IsWindows -or -not [Environment]::Is64BitProcess -or
    $env:GITHUB_ACTIONS -cne 'true' -or
    $env:RUNNER_ENVIRONMENT -cne 'github-hosted' -or
    $env:DSS_DISPOSABLE_WINDOWS_IDENTITY_PROBE -cne '1' -or
    [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP)) {
    throw 'Requires explicitly admitted disposable GitHub-hosted Windows runner.'
}
$controller = [Security.Principal.WindowsIdentity]::GetCurrent()
try {
    if (-not ([Security.Principal.WindowsPrincipal]::new($controller)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Disposable fixture controller must be elevated.'
    }
    $controllerSid = $controller.User.Value
} finally { $controller.Dispose() }
$base = [IO.Path]::GetFullPath($env:RUNNER_TEMP)
if ($base -notmatch '^[A-Za-z]:\\' -or -not [IO.Directory]::Exists($base)) {
    throw 'Runner temp must be an existing local-drive directory.'
}
$nonce = [Guid]::NewGuid().ToString('N')
$arena = [IO.Path]::GetFullPath([IO.Path]::Combine($base, 'dss037-identity-' + $nonce))
if (-not $arena.StartsWith($base.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or
    [IO.Directory]::Exists($arena) -or [IO.File]::Exists($arena)) { throw 'Fresh arena guard failed.' }
Add-Type -Path ([IO.Path]::Combine($PSScriptRoot, 'windows-identity-native.cs'))
$accounts = [Collections.Generic.List[object]]::new()
$tokens = [Collections.Generic.List[IDisposable]]::new()
$handles = [Collections.Generic.List[IDisposable]]::new()
$passwords = [Collections.Generic.List[Security.SecureString]]::new()
# Local account descriptions are bounded; retain the full invocation nonce.
$description = 'DSS037 disposable ' + $nonce.Substring(0, 24)
try {
    foreach ($prefix in @('dssS-', 'dssA-')) {
        $name = $prefix + $nonce.Substring(0, 10)
        if (Get-LocalUser -Name $name -ErrorAction SilentlyContinue) { throw 'Fixture account collision.' }
        $password = [Security.SecureString]::new()
        $passwords.Add($password)
        foreach ($character in 'Aa9!'.ToCharArray()) { $password.AppendChar($character) }
        $alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%'
        for ($index = 0; $index -lt 40; $index++) {
            $password.AppendChar($alphabet[[Security.Cryptography.RandomNumberGenerator]::GetInt32($alphabet.Length)])
        }
        $password.MakeReadOnly()
        $account = New-LocalUser -Name $name -Password $password -AccountNeverExpires `
            -PasswordNeverExpires -Description $description
        $accounts.Add($account)
        $users = Get-LocalGroup -SID 'S-1-5-32-545'
        $members = @(Get-LocalGroupMember -Group $users)
        if (-not ($members | Where-Object { $_.SID.Value -eq $account.SID.Value })) {
            Add-LocalGroupMember -Group $users -Member $account
        }
        $token = [Dss037IdentityNative]::Logon($name, $password)
        $tokens.Add($token)
        if ([Dss037IdentityNative]::Identity($token) -cne $account.SID.Value) { throw 'Actual logon SID mismatch.' }
    }
    $serviceSid = $accounts[0].SID.Value
    $attackerSid = $accounts[1].SID.Value
    if ($serviceSid -eq $attackerSid -or $serviceSid -eq $controllerSid -or $attackerSid -eq $controllerSid) {
        throw 'Fixture identities must be distinct.'
    }
    [IO.Directory]::CreateDirectory($arena) | Out-Null
    $trusted = "D:P(A;OICI;FA;;;${controllerSid})(A;OICI;FA;;;SY)(A;OICI;FA;;;${serviceSid})"
    [Dss037IdentityNative]::Descriptor($arena, $trusted + "(A;;FRFX;;;${attackerSid})")
    $safe = [IO.Path]::Combine($arena, 'safe-empty')
    $unsafe = [IO.Path]::Combine($arena, 'unsafe-empty')
    $historical = [IO.Path]::Combine($arena, 'historical-empty')
    $stage = [IO.Path]::Combine($arena, 'private-stage')
    # Synchronous impersonated delegate, with no asynchronous continuation.
    [Security.Principal.WindowsIdentity]::RunImpersonated($tokens[0], [Action]{
        foreach ($path in @($safe, $unsafe, $historical, $stage)) {
            [IO.Directory]::CreateDirectory($path) | Out-Null
        }
        [IO.File]::WriteAllText([IO.Path]::Combine($stage, 'secret.txt'), 'SYNTHETIC PRIVATE STAGE')
    })
    $safeAcl = $trusted + "(A;;0x001200a7;;;${attackerSid})(A;OICIIO;FA;;;CO)"
    $unsafeAcl = $trusted + "(A;;0x001201b6;;;${attackerSid})"
    [Dss037IdentityNative]::Descriptor($safe, $safeAcl)
    [Dss037IdentityNative]::Descriptor($unsafe, $unsafeAcl)
    [Dss037IdentityNative]::Descriptor($historical, $unsafeAcl)
    [Dss037IdentityNative]::Descriptor($stage, $trusted)
    $heldUnsafe = [Dss037IdentityNative]::Open($tokens[0], $unsafe, 0x20080)
    $handles.Add($heldUnsafe)
    $heldHistorical = [Dss037IdentityNative]::Open($tokens[0], $historical, 0x20080)
    $handles.Add($heldHistorical)
    $attackerHistorical = [Dss037IdentityNative]::Open($tokens[1], $historical, 0x102)
    $handles.Add($attackerHistorical)
    $attackerUnsafe = [Dss037IdentityNative]::Open($tokens[1], $unsafe, 0x102)
    $handles.Add($attackerUnsafe)
    [Security.Principal.WindowsIdentity]::RunImpersonated($tokens[1], [Action]{
        [IO.File]::WriteAllText([IO.Path]::Combine($safe, 'writer-created.txt'), 'SYNTHETIC WRITER')
    })
    $denials = [ordered]@{}
    foreach ($access in @(0x100, 0x40, 0x40000, 0x80000, 0x102)) {
        $outcome = [Dss037IdentityNative]::OpenOutcome($tokens[1], $safe, $access)
        $denials[('0x{0:x}' -f $access)] = $outcome
        if ($outcome -ne 5) { throw "Expected safe-directory access denial for mask $access; actual $outcome" }
    }
    $privateRead = [Dss037IdentityNative]::OpenOutcome($tokens[1], [IO.Path]::Combine($stage, 'secret.txt'), 1)
    if ($privateRead -ne 5) { throw "Expected private-stage denial; actual $privateRead" }
    $unsafeOutcome = [Dss037IdentityNative]::Junction($tokens[1], $attackerUnsafe, $stage)
    if ($unsafeOutcome -ne 0 -or [Dss037IdentityNative]::Tag($heldUnsafe) -ne 0xA0000003) {
        throw "Writable metadata positive control failed: $unsafeOutcome"
    }
    [Dss037IdentityNative]::Descriptor($historical, $safeAcl)
    $newOpen = [Dss037IdentityNative]::OpenOutcome($tokens[1], $historical, 0x102)
    if ($newOpen -ne 5) { throw "Revoked ACL did not reject new metadata handle: $newOpen" }
    $historicalOutcome = [Dss037IdentityNative]::Junction($tokens[1], $attackerHistorical, $stage)
    $historicalTag = [Dss037IdentityNative]::Tag($heldHistorical)
    # Fail closed on unexpected outcomes; this packet tests the concrete counterexample.
    if ($historicalOutcome -ne 0 -or $historicalTag -ne 0xA0000003) {
        throw "Historical-handle counterexample not reproduced: error=$historicalOutcome tag=$historicalTag"
    }
    if ([IO.File]::ReadAllText([IO.Path]::Combine($stage, 'secret.txt')) -cne 'SYNTHETIC PRIVATE STAGE') {
        throw 'Private sentinel changed.'
    }
    [ordered]@{
        kind = 'real local logons; synchronous impersonation, not independent processes'
        arena = $arena; serviceSid = $serviceSid; attackerSid = $attackerSid
        safeDirectoryDenials = $denials; privateReadError = $privateRead
        unsafeJunctionError = $unsafeOutcome; revokedNewOpenError = $newOpen
        historicalJunctionError = $historicalOutcome; historicalTag = $historicalTag
        privateBytesUnchanged = $true; productionContainmentProved = $false
    } | ConvertTo-Json -Depth 5
} finally {
    foreach ($handle in $handles) { $handle.Dispose() }
    foreach ($token in $tokens) { $token.Dispose() }
    foreach ($password in $passwords) { $password.Dispose() }
    foreach ($account in $accounts) {
        $current = Get-LocalUser -SID $account.SID
        if ($current.Name -cne $account.Name -or $current.Description -cne $description) {
            throw 'Refusing to remove an account whose fixture identity changed.'
        }
        Remove-LocalUser -SID $account.SID
    }
    # Fixture junctions remain for disposable VM teardown; never recurse through them.
}
