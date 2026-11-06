#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Native Security Test Fixtures
📄 File: tools/agent-helpers/debt037/windows-acl-fixture.ps1
🎯 Purpose: Admits a fresh test arena before creating DACL positive controls.
🧠 Responsibilities: Restricts mutations to owned, non-reparse temporary leaves.
🏗️ Architecture: Native test helper only; no deployment/application integration.
⚠️ Important: Guards prevent accidental use, not a malicious administrator.
🚀 Build. Share. Grow.
===============================================================
#>
param(
    [Parameter(Mandatory)][string]$Arena,
    [Parameter(Mandatory)][ValidateSet('null-dacl', 'empty-dacl', 'entries')][string]$Mode
)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows -or $env:DSS_NATIVE_SECURITY_FIXTURE -cne '1' -or
    -not [IO.Path]::IsPathFullyQualified($Arena)) { throw 'Requires an admitted Windows test fixture.' }
$arenaPath = [IO.Path]::GetFullPath($Arena).TrimEnd('\')
$base = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
if (-not [IO.Path]::GetDirectoryName($arenaPath).Equals($base, [StringComparison]::OrdinalIgnoreCase) -or
    [IO.Path]::GetFileName($arenaPath) -notmatch '^dss-native-r2-[A-Za-z0-9]+$') {
    throw 'Fixture must be a fresh native R2 arena directly under system temp.'
}
$leaf = [IO.Path]::Combine($arenaPath, $Mode)
foreach ($path in @($arenaPath, $leaf)) {
    $item = Get-Item -LiteralPath $path -Force
    if ($item -isnot [IO.DirectoryInfo] -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'Refusing a non-directory or linked ACL fixture.'
    }
}
Add-Type -Path ([IO.Path]::Combine($PSScriptRoot, 'windows-acl-fixture.cs'))
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
try {
    foreach ($path in @($arenaPath, $leaf)) {
        $owner = (Get-Acl -LiteralPath $path).GetOwner([Security.Principal.SecurityIdentifier]).Value
        if ($owner -cne $identity.User.Value -and $owner -cne $identity.Owner.Value) {
            throw 'Refusing an unowned ACL fixture.'
        }
    }
    [Dss037AclFixture]::Apply($leaf, $Mode, $identity.User.Value)
}
finally { $identity.Dispose() }
Write-Output ('{"fixture":"windows-dacl","mode":"' + $Mode + '"}')
