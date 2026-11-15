#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Storage Rights Evidence Review
📄 File: tools/agent-helpers/debt037/r5/inspect-evidence.ps1
🎯 Purpose: Inspects one downloaded proof ZIP without extracting archive paths.
🧠 Responsibilities: Verifies the expected digest and bounds every JSON field and control.
🏗️ Architecture: Local read-only artifact review plus tool-managed evidence preservation.
⚠️ Important: Never executes archived files or interprets actor success as admission.
🚀 Build. Share. Grow.
===============================================================
#>
param(
    [Parameter(Mandatory)][string]$ZipPath,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedZipSha,
    [Parameter(Mandatory)][ValidateSet('win32', 'linux', 'darwin')][string]$Platform
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, '../../../..'))
$cache = [IO.Path]::Combine($root, 'node_modules', '.cache')
$zip = [IO.Path]::GetFullPath($ZipPath)
if (-not $zip.StartsWith($cache + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
    -not [IO.File]::Exists($zip)) { throw 'Expected an existing workspace-cache artifact.' }
if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ine $ExpectedZipSha) { throw 'Artifact ZIP digest mismatch.' }
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
    if ($archive.Entries.Count -ne 1) { throw 'Expected exactly one evidence record file.' }
    $entry = $archive.Entries[0]
    if ($entry.FullName -cne ('rights-actor-' + $Platform + '.json') -or $entry.Length -le 0 -or $entry.Length -gt 65536) {
        throw 'Unexpected or oversized evidence entry.'
    }
    $stream = $entry.Open()
    $memory = [IO.MemoryStream]::new()
    try {
        $buffer = [byte[]]::new(4096)
        while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            if ($memory.Length + $read -gt 65536) { throw 'Expanded evidence exceeds its bound.' }
            $memory.Write($buffer, 0, $read)
        }
        $bytes = $memory.ToArray()
    }
    finally { $stream.Dispose(); $memory.Dispose() }
    if ($bytes.Length -ne $entry.Length) { throw 'Evidence length mismatch.' }
} finally { $archive.Dispose() }
$value = [Text.UTF8Encoding]::new($false, $true).GetString($bytes) | ConvertFrom-Json -AsHashtable
$expectedKeys = @('kind', 'platform', 'node', 'exitCode', 'admitted', 'records')
if ($value.ContainsKey('failure')) { $expectedKeys += 'failure' }
if (@(Compare-Object @($value.Keys | Sort-Object) @($expectedKeys | Sort-Object)).Count -ne 0 -or
    $value.kind -cne 'rights-actor-proof' -or $value.platform -cne $Platform -or
    $value.node -cne ('v' + (Get-Content -LiteralPath ([IO.Path]::Combine($root, '.node-version')) -Raw).Trim()) -or
    $value.admitted -isnot [bool] -or $value.admitted -ne $false -or $value.records.Count -gt 2 -or
    ($null -ne $value.exitCode -and ($value.exitCode -isnot [long] -and $value.exitCode -isnot [int] -or
      $value.exitCode -lt 0 -or $value.exitCode -gt 255))) { throw 'Unbounded evidence envelope.' }
if ($null -ne $value.failure) {
    if (@(Compare-Object @($value.failure.Keys | Sort-Object) @('osCode', 'stage')).Count -ne 0 -or
        $value.failure.stage -cnotmatch '^[a-z/-]{1,80}$' -or
        ($null -ne $value.failure.osCode -and ($value.failure.osCode -lt 0 -or $value.failure.osCode -gt [uint32]::MaxValue))) {
        throw 'Unbounded failure diagnostic.'
    }
}
$seen = [Collections.Generic.HashSet[string]]::new()
$controls = 0
foreach ($record in $value.records) {
    if (@(Compare-Object @($record.Keys | Sort-Object) @('actor', 'checks', 'identityChecked', 'kind')).Count -ne 0 -or
        $record.kind -cne 'result' -or $record.actor -cnotin @('service', 'attacker') -or
        $record.identityChecked -isnot [bool] -or $record.identityChecked -ne $true -or -not $seen.Add($record.actor)) { throw 'Invalid actor envelope.' }
    $expected = if ($record.actor -ceq 'service') {
        @('usableProtected', 'usablePrivate', 'sharedCreationModel', 'foreignOwner', 'dangerousAllow', 'inheritedGrant', 'serviceDenial', 'parentDeletion')
    } else { @('sharedCreation', 'protectedDenial', 'privateDenial', 'allowPositive') }
    if ($Platform -cne 'linux') { $expected += $(if ($record.actor -ceq 'service') { 'noDenyCredit' } else { 'denyKernelControl' }) }
    if ($Platform -ceq 'win32' -and $record.actor -ceq 'service') { $expected += 'emptyVsNull' }
    if (@(Compare-Object @($record.checks.Keys | Sort-Object) @($expected | Sort-Object)).Count -ne 0 -or
        @($record.checks.Values | Where-Object { $_ -isnot [bool] -or $_ -ne $true }).Count -ne 0) { throw 'Incomplete or unbounded actor controls.' }
    $controls += $expected.Count
}
if ($value.exitCode -eq 0 -and ($seen.Count -ne 2 -or $null -ne $value.failure)) { throw 'Successful evidence is incomplete.' }
$destination = [IO.Path]::Combine([IO.Path]::GetDirectoryName($zip), 'rights-actor-' + $Platform + '.json')
if ([IO.File]::Exists($destination)) {
    if ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($destination))) -cne
        [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))) { throw 'Refusing to overwrite different evidence.' }
} else { [IO.File]::WriteAllBytes($destination, $bytes) }
[ordered]@{ platform = $Platform; exitCode = $value.exitCode; actors = $seen.Count; controls = $controls
    admitted = $false; jsonSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    failure = $value.failure } | ConvertTo-Json -Depth 5
