#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Disposable Rights Actor Proof
📄 File: tools/agent-helpers/debt037/r5/windows-controller.ps1
🎯 Purpose: Proves ordinary primary-token service/attacker behavior in hosted Windows CI.
🧠 Responsibilities: Guards accounts, prepares synthetic ACLs and owns ready/go processes.
🏗️ Architecture: Opt-in CI orchestration; no application or developer-host mutation.
⚠️ Important: Removes only invocation-owned accounts; never recursively deletes fixtures.
🚀 Build. Share. Grow.
===============================================================
#>
param([Parameter(Mandatory)][string]$NodePath, [Parameter(Mandatory)][string]$BinaryPath)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows -or $env:GITHUB_ACTIONS -cne 'true' -or
    $env:RUNNER_ENVIRONMENT -cne 'github-hosted' -or $env:DSS_RIGHTS_ACTOR_PROOF -cne '1' -or
    [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP)) { throw 'Requires opted-in disposable hosted Windows CI.' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
try {
    if (-not ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Disposable controller must be elevated.'
    }
} finally { $identity.Dispose() }
$nonce = [Guid]::NewGuid().ToString('N')
$description = 'DSS R5 ' + $nonce.Substring(0, 24)
$base = [IO.Path]::GetFullPath($env:RUNNER_TEMP)
$arena = [IO.Path]::GetFullPath([IO.Path]::Combine($base, 'dss-r5-' + $nonce))
if (-not $arena.StartsWith($base.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or
    [IO.Directory]::Exists($arena)) { throw 'Fresh proof arena required.' }
Add-Type -Path @([IO.Path]::Combine($PSScriptRoot, '../windows-identity-native.cs'), [IO.Path]::Combine($PSScriptRoot, 'windows-process.cs'))
$accounts = [Collections.Generic.List[object]]::new()
$tokens = [Collections.Generic.List[IDisposable]]::new()
$passwords = [Collections.Generic.List[IDisposable]]::new()
$children = [Collections.Generic.List[IDisposable]]::new()
$channels = @{}
$listener = $null
$stage = 'provision'
$proofFailed = $false
$setupOsCode = $null
try {
    foreach ($prefix in @('r5S-', 'r5A-')) {
        $name = $prefix + $nonce.Substring(0, 10)
        if (Get-LocalUser -Name $name -ErrorAction SilentlyContinue) { throw 'Account collision.' }
        $password = [Security.SecureString]::new()
        $passwords.Add($password)
        foreach ($character in 'Aa9!'.ToCharArray()) { $password.AppendChar($character) }
        $alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%'
        for ($index = 0; $index -lt 40; $index++) {
            $password.AppendChar($alphabet[[Security.Cryptography.RandomNumberGenerator]::GetInt32($alphabet.Length)])
        }
        $password.MakeReadOnly()
        $account = New-LocalUser -Name $name -Password $password -AccountNeverExpires -PasswordNeverExpires -Description $description
        $accounts.Add($account)
        if (-not (Get-LocalGroupMember -SID 'S-1-5-32-545' | Where-Object { $_.SID.Value -eq $account.SID.Value })) {
            Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $account
        }
        if (Get-LocalGroupMember -SID 'S-1-5-32-544' | Where-Object { $_.SID.Value -eq $account.SID.Value }) {
            throw 'Proof accounts must be ordinary users.'
        }
        $token = [Dss037IdentityNative]::Logon($name, $password)
        $tokens.Add($token)
        if ([Dss037IdentityNative]::Identity($token) -cne $account.SID.Value) { throw 'Token identity mismatch.' }
    }
    $serviceSid = $accounts[0].SID.Value
    $attackerSid = $accounts[1].SID.Value
    if ($serviceSid -ceq $attackerSid) { throw 'Distinct identities required.' }
    $stage = 'prepare-fixtures'
    [IO.Directory]::CreateDirectory($arena) | Out-Null
    $code = [IO.Path]::Combine($arena, 'code')
    $work = [IO.Path]::Combine($arena, 'fixtures')
    [IO.Directory]::CreateDirectory($code) | Out-Null
    [IO.Directory]::CreateDirectory($work) | Out-Null
    Copy-Item -LiteralPath $NodePath -Destination ([IO.Path]::Combine($code, 'node.exe'))
    Copy-Item -LiteralPath $BinaryPath -Destination ([IO.Path]::Combine($code, 'probe.node'))
    Copy-Item -LiteralPath ([IO.Path]::Combine($PSScriptRoot, 'actor.cjs')) -Destination ([IO.Path]::Combine($code, 'actor.cjs'))
    $admins = '(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)'
    $service = "(A;OICI;FA;;;${serviceSid})"
    $readers = "(A;OICI;FRFX;;;${serviceSid})(A;OICI;FRFX;;;${attackerSid})"
    [Dss037IdentityNative]::Descriptor($arena, 'D:P' + $admins + $readers)
    [Dss037IdentityNative]::Descriptor($code, 'D:P' + $admins + $readers)
    # Code files already exist: explicitly protect each, not just future inheritance.
    foreach ($file in @('node.exe', 'probe.node', 'actor.cjs')) {
        [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($code, $file), 'D:P' + $admins + $readers)
    }
    [Dss037IdentityNative]::Descriptor($work, 'D:P' + $admins + $service + "(A;;0x001200a7;;;${attackerSid})")
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start(2)
    $port = $listener.LocalEndpoint.Port
    foreach ($actor in @('attacker', 'service')) {
        $stage = 'launch-' + $actor
        $index = if ($actor -ceq 'service') { 0 } else { 1 }
        $child = [DssR5Process]::Launch($tokens[$index], $accounts[$index].SID.Value,
            [IO.Path]::Combine($code, 'node.exe'), [IO.Path]::Combine($code, 'actor.cjs'), $port, $nonce,
            $actor, $work, [IO.Path]::Combine($code, 'probe.node'), $arena)
        $children.Add($child)
        $stage = 'ready-' + $actor
        $pending = $listener.AcceptTcpClientAsync()
        if (-not $pending.Wait(60000)) {
            $childStatus = $child.Status
            if ($childStatus -ne 259) { $stage = 'exit-before-ready-' + $actor; $setupOsCode = $childStatus }
            $bootstrap = [IO.Path]::Combine($work, $actor + '-bootstrap.json')
            if ([IO.File]::Exists($bootstrap) -and ([IO.FileInfo]::new($bootstrap)).Length -le 1024) {
                $started = [IO.File]::ReadAllText($bootstrap) | ConvertFrom-Json
                if ($started.started -ceq $true) {
                    $stage = 'actor-load-' + $actor
                    if ($started.environmentReady -cne $true) { $stage = 'bootstrap-environment-' + $actor }
                }
            }
            $diagnostic = [IO.Path]::Combine($work, $actor + '-failure.json')
            if ([IO.File]::Exists($diagnostic) -and ([IO.FileInfo]::new($diagnostic)).Length -le 1024) {
                $failure = [IO.File]::ReadAllText($diagnostic) | ConvertFrom-Json
                if ($failure.stage -cmatch '^[a-z-]{1,48}$' -and $failure.code -cmatch '^[A-Z_]{2,64}$') {
                    $stage = 'setup-' + $actor + '-' + $failure.stage + '-' + $failure.code.ToLowerInvariant().Replace('_', '-')
                    if ($failure.osCode -ge 0 -and $failure.osCode -le [uint32]::MaxValue) { $setupOsCode = $failure.osCode }
                }
            }
            throw 'Actor readiness deadline exceeded.'
        }
        $client = $pending.GetAwaiter().GetResult()
        $stream = $client.GetStream()
        $stream.ReadTimeout = 60000
        $stream.WriteTimeout = 60000
        $reader = [IO.StreamReader]::new($stream, [Text.UTF8Encoding]::new($false), $false, 1024, $true)
        $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false), 1024, $true)
        $writer.AutoFlush = $true
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line.Length -gt 65536) { throw 'Invalid readiness record.' }
        $ready = $line | ConvertFrom-Json
        if ($ready.kind -cne 'ready' -or $ready.actor -cne $actor -or $ready.nonce -cne $nonce) { throw 'Actor protocol mismatch.' }
        $channels[$actor] = @{ Client = $client; Reader = $reader; Writer = $writer; Child = $child }
    }
    $stage = 'configure-acls'
    [Dss037IdentityNative]::Descriptor($work, 'D:P' + $admins + $service + "(A;;FRFX;;;${attackerSid})")
    foreach ($name in @('protected', 'control', 'shared', 'unsafe', 'inherited', 'denied', 'deny-allow', 'parent', 'parent/child')) {
        [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, $name), 'D:P' + $admins + $service)
    }
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'shared'), 'D:P' + $admins + $service + "(A;;0x001200a7;;;${attackerSid})")
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'unsafe'), 'D:P' + $admins + $service + "(A;;0x001201b6;;;${attackerSid})")
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'inherited'), 'D:P' + $admins + $service + "(A;OICIIO;FA;;;${attackerSid})")
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'denied'), 'D:P' + $admins + "(A;;FRFX;;;${serviceSid})")
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'deny-allow'), "D:P(D;;0x2;;;${attackerSid})" + $admins + $service + "(A;;0x001200a7;;;${attackerSid})")
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'parent'), 'D:P' + $admins + $service + "(A;;0x001200e1;;;${attackerSid})")
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'foreign'), 'D:P' + $admins + "(A;;FRFX;;;${serviceSid})(A;;FA;;;${attackerSid})")
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'empty'), 'D:P')
    [Dss037IdentityNative]::Descriptor([IO.Path]::Combine($work, 'null'), 'D:NO_ACCESS_CONTROL')
    foreach ($actor in @('service', 'attacker')) {
        $stage = 'result-' + $actor
        $channel = $channels[$actor]
        $channel.Writer.WriteLine('go')
        $line = $channel.Reader.ReadLine()
        if ($null -eq $line -or $line.Length -gt 65536) { throw 'Missing bounded actor result.' }
        $record = $line | ConvertFrom-Json
        if ($record.kind -cne 'result' -or $record.actor -cne $actor) {
            if ($record.kind -ceq 'failure' -and $record.stage -cmatch '^[a-z/-]{1,48}$') {
                throw ('Actor check failed: ' + $record.stage)
            }
            throw 'Invalid actor result.'
        }
        $channel.Writer.Dispose(); $channel.Reader.Dispose(); $channel.Client.Dispose()
        if ($channel.Child.Finish() -ne 0) { throw 'Ordinary actor failed.' }
        $line
    }
} catch {
    $proofFailed = $true
    $original = $_.Exception.GetBaseException()
    $code = [int]($original.HResult -band 65535)
    if ($original -is [ComponentModel.Win32Exception]) { $code = $original.NativeErrorCode }
    if ($null -ne $setupOsCode) { $code = $setupOsCode }
    if ($original.Message -cmatch 'Proof process failure at ([a-z-]{1,48}), code ([0-9]{1,10})') {
        $stage = $Matches[1]; $code = [long]$Matches[2]
    } elseif ($original.Message -cmatch 'Actor check failed: ([a-z/-]{1,48})') {
        $stage = 'actor-' + $Matches[1].Replace('/', '-')
    }
    [Console]::Error.WriteLine('DSS_R5_FAILURE stage=' + $stage + ' code=' + $code)
} finally {
    $cleanupFailed = $false
    if ($null -ne $listener) { $listener.Stop() }
    foreach ($channel in $channels.Values) {
        foreach ($resource in @($channel.Writer, $channel.Reader, $channel.Client)) {
            try { $resource.Dispose() } catch { $cleanupFailed = $true }
        }
    }
    foreach ($resource in @($children.ToArray()) + @($tokens.ToArray())) {
        try { $resource.Dispose() } catch { $cleanupFailed = $true }
    }
    foreach ($account in $accounts) {
        try {
            $actual = Get-LocalUser -SID $account.SID -ErrorAction SilentlyContinue
            if ($null -ne $actual -and $actual.Description -ceq $description) { Remove-LocalUser -SID $account.SID }
        } catch { $cleanupFailed = $true }
    }
    foreach ($password in $passwords) { $password.Dispose() }
    # No recursive fixture deletion: disposable runner teardown owns the arena.
    if ($cleanupFailed) { throw 'Owned proof cleanup failed; disposable VM teardown remains required.' }
}
if ($proofFailed) { exit 1 }
