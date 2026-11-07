#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Disposable Storage Qualification Proof
📄 File: tools/agent-helpers/debt037/r6/windows-controller.ps1
🎯 Purpose: Provisions invocation-owned ordinary actors for held-object transition proof.
🧠 Responsibilities: Guards account cleanup, synthetic ACLs and native/TCP barriers.
🏗️ Architecture: Hosted CI only, reusing accepted R5 managed credential launch.
⚠️ Important: No developer elevation or recursive fixture/profile deletion.
🚀 Build. Share. Grow.
===============================================================
#>
param([Parameter(Mandatory)][string]$NodePath, [Parameter(Mandatory)][string]$ProbePath)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows -or $env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted' -or
    $env:DSS_QUALIFICATION_PROOF -cne '1' -or [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP)) {
    throw 'Requires opted-in disposable hosted Windows CI.'
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
try {
    if (-not ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Disposable controller must be elevated.'
    }
} finally { $identity.Dispose() }
Add-Type -Path @([IO.Path]::Combine($PSScriptRoot, '../windows-identity-native.cs'), [IO.Path]::Combine($PSScriptRoot, '../r5/windows-process.cs'))
$nonce = [Guid]::NewGuid().ToString('N')
$description = 'DSS R6 ' + $nonce.Substring(0, 24)
$base = [IO.Path]::GetFullPath($env:RUNNER_TEMP)
$arena = [IO.Path]::GetFullPath([IO.Path]::Combine($base, 'dss-r6-' + $nonce))
if (-not $arena.StartsWith($base.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or [IO.Directory]::Exists($arena)) {
    throw 'Fresh contained proof arena required.'
}
$accounts = [Collections.Generic.List[object]]::new()
$passwords = [Collections.Generic.List[IDisposable]]::new()
$children = [Collections.Generic.List[IDisposable]]::new()
$channels = @{}
$listener = $null
$stage = 'provision'
$failed = $false
function Exchange([string]$Actor, [string]$Command, [string]$Kind) {
    $script:stage = $Command + '-' + $Actor
    $channel = $channels[$Actor]
    $channel.Writer.WriteLine($Command)
    $line = $channel.Reader.ReadLine()
    if ($null -eq $line -or $line.Length -gt 65536) { throw 'Missing bounded protocol response.' }
    $value = $line | ConvertFrom-Json
    if ($value.kind -cne $Kind) { throw 'Protocol response mismatch.' }
    return $line
}
try {
    foreach ($prefix in @('r6S-', 'r6A-')) {
        $name = $prefix + $nonce.Substring(0, 10)
        if (Get-LocalUser -Name $name -ErrorAction SilentlyContinue) { throw 'Account collision.' }
        $password = [Security.SecureString]::new(); $passwords.Add($password)
        foreach ($character in ('Aa9!' + [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))).ToCharArray()) {
            $password.AppendChar($character)
        }
        $password.MakeReadOnly()
        $account = New-LocalUser -Name $name -Password $password -AccountNeverExpires -PasswordNeverExpires -Description $description
        $accounts.Add($account)
        if (-not (Get-LocalGroupMember -SID 'S-1-5-32-545' | Where-Object { $_.SID.Value -eq $account.SID.Value })) {
            Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $account
        }
        if (Get-LocalGroupMember -SID 'S-1-5-32-544' | Where-Object { $_.SID.Value -eq $account.SID.Value }) { throw 'Ordinary accounts required.' }
    }
    if ($accounts[0].SID.Value -ceq $accounts[1].SID.Value) { throw 'Distinct actors required.' }
    $serviceSid = $accounts[0].SID.Value; $attackerSid = $accounts[1].SID.Value
    $code = [IO.Path]::Combine($arena, 'code'); $work = [IO.Path]::Combine($arena, 'fixtures')
    [IO.Directory]::CreateDirectory($code) | Out-Null
    [IO.Directory]::CreateDirectory($work) | Out-Null
    Copy-Item -LiteralPath $ProbePath -Destination ([IO.Path]::Combine($code, 'probe.exe'))
    Copy-Item -LiteralPath ([IO.Path]::Combine($PSScriptRoot, 'actor.cjs')) -Destination ([IO.Path]::Combine($code, 'actor.cjs'))
    $admins = '(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)'
    $service = "(A;OICI;FA;;;${serviceSid})"
    $readers = "(A;OICI;FRFX;;;${serviceSid})(A;OICI;FRFX;;;${attackerSid})"
    foreach ($path in @($arena, $code, $work, ([IO.Path]::Combine($code, 'actor.cjs')), ([IO.Path]::Combine($code, 'probe.exe')))) {
        [Dss037IdentityNative]::Descriptor($path, 'D:P' + $admins + $readers)
    }
    # Accepted launch writes one actor-owned bootstrap marker before entering the JS child.
    [Dss037IdentityNative]::Descriptor($work, 'D:P' + $admins + $service + "(A;;0x001200a7;;;${attackerSid})")
    foreach ($name in @('shared', 'outside', 'normal')) {
        $path = [IO.Path]::Combine($work, $name)
        [IO.Directory]::CreateDirectory($path) | Out-Null
        $access = if ($name -ceq 'shared') { $service + "(A;OICI;FA;;;${attackerSid})" } else { $service + $readers }
        [Dss037IdentityNative]::Descriptor($path, 'D:P' + $admins + $access)
    }
    [IO.File]::WriteAllText([IO.Path]::Combine($work, 'outside/sentinel'), 'SYNTHETIC OUTSIDE')
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0); $listener.Start(2)
    foreach ($actor in @('service', 'attacker')) {
        $stage = 'launch-' + $actor
        $index = if ($actor -ceq 'service') { 0 } else { 1 }
        $child = [DssR5Process]::Launch($accounts[$index].Name, $passwords[$index], $accounts[$index].SID.Value,
            $NodePath, [IO.Path]::Combine($code, 'actor.cjs'), $listener.LocalEndpoint.Port, $nonce,
            $actor, $work, [IO.Path]::Combine($code, 'probe.exe'), $arena)
        $children.Add($child)
        $pending = $listener.AcceptTcpClientAsync()
        if (-not $pending.Wait(60000)) { throw 'Actor readiness deadline exceeded.' }
        $client = $pending.GetAwaiter().GetResult(); $stream = $client.GetStream()
        $stream.ReadTimeout = 60000; $stream.WriteTimeout = 60000
        $reader = [IO.StreamReader]::new($stream, [Text.UTF8Encoding]::new($false), $false, 1024, $true)
        $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false), 1024, $true); $writer.AutoFlush = $true
        $channels[$actor] = @{Client=$client;Reader=$reader;Writer=$writer;Child=$child}
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line.Length -gt 1024) { throw 'Invalid readiness extent.' }
        $ready = $line | ConvertFrom-Json
        if ($ready.kind -cne 'ready' -or $ready.actor -cne $actor -or $ready.nonce -cne $nonce) { throw 'Readiness mismatch.' }
    }
    [Dss037IdentityNative]::Descriptor($work, 'D:P' + $admins + $readers)
    '{"kind":"fixture-evidence","controls":[{"name":"ordinary-primary-tokens","state":"present","value":true,"toolExitCode":null},{"name":"remote-fixture","state":"unsupported","value":null,"toolExitCode":null},{"name":"removable-fixture","state":"unsupported","value":null,"toolExitCode":null}]}'
    Exchange 'service' 'hold' 'held' | Out-Null
    Exchange 'attacker' 'transition' 'transition-created' | Out-Null
    foreach ($actor in @('service', 'attacker')) {
        Exchange $actor 'observe' 'result'
        $channel = $channels[$actor]
        $channel.Writer.Dispose(); $channel.Reader.Dispose(); $channel.Client.Dispose()
        if ($channel.Child.Finish() -ne 0) { throw 'Ordinary actor failed.' }
    }
    if ([IO.File]::ReadAllText([IO.Path]::Combine($work, 'outside/sentinel')) -cne 'SYNTHETIC OUTSIDE') { throw 'Sentinel changed.' }
} catch {
    $failed = $true
    $original = $_.Exception.GetBaseException(); $nativeCode = 0
    if ($original -is [ComponentModel.Win32Exception]) { $nativeCode = $original.NativeErrorCode }
    [Console]::Error.WriteLine('DSS_R6_FAILURE stage=' + $stage + ' code=' + $nativeCode)
} finally {
    $cleanupFailed = $false
    if ($null -ne $listener) { $listener.Stop() }
    foreach ($channel in $channels.Values) {
        foreach ($resource in @($channel.Writer, $channel.Reader, $channel.Client)) {
            try { $resource.Dispose() } catch { $cleanupFailed = $true }
        }
    }
    foreach ($child in $children) { try { $child.Dispose() } catch { $cleanupFailed = $true } }
    foreach ($account in $accounts) {
        try {
            $actual = Get-LocalUser -SID $account.SID -ErrorAction SilentlyContinue
            if ($null -ne $actual -and $actual.Description -ceq $description) { Remove-LocalUser -SID $account.SID }
        } catch { $cleanupFailed = $true }
    }
    foreach ($password in $passwords) { $password.Dispose() }
    if ($cleanupFailed) { throw 'Owned proof cleanup failed; disposable VM teardown remains required.' }
}
if ($failed) { exit 1 }
