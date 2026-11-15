#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Storage Qualification Evidence Review
📄 File: tools/agent-helpers/debt037/r6/inspect-evidence.ps1
🎯 Purpose: Verifies and reads one proof ZIP without extracting archive paths.
🧠 Responsibilities: Checks digest/size/entry, retains bytes and delegates schema review.
🏗️ Architecture: Local helper with existing .NET ZIP and Node tooling only.
⚠️ Important: No archived code is executed; failed/partial evidence remains preserved.
🚀 Build. Share. Grow.
===============================================================
#>
param(
    [Parameter(Mandatory)][string]$ZipPath,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedZipSha,
    [Parameter(Mandatory)][ValidateSet('win32','linux','darwin')][string]$Platform,
    [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedTree
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, '../../../..'))
$cache = [IO.Path]::Combine($root, 'node_modules', '.cache')
$zip = [IO.Path]::GetFullPath($ZipPath)
if (-not $zip.StartsWith($cache + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
    -not [IO.File]::Exists($zip)) { throw 'Expected workspace-cache proof ZIP.' }
if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ine $ExpectedZipSha) { throw 'ZIP digest mismatch.' }
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
    if ($archive.Entries.Count -ne 1) { throw 'Exactly one proof record required.' }
    $entry = $archive.Entries[0]
    if ($entry.FullName -cne ('qualification-proof-' + $Platform + '.json') -or $entry.Length -le 0 -or $entry.Length -gt 262144) {
        throw 'Unexpected proof entry or size.'
    }
    $stream = $entry.Open(); $memory = [IO.MemoryStream]::new()
    try {
        $buffer = [byte[]]::new(4096)
        while (($count = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            if ($memory.Length + $count -gt 262144) { throw 'Expanded record exceeds bound.' }
            $memory.Write($buffer, 0, $count)
        }
        $bytes = $memory.ToArray()
        if ($bytes.Length -ne $entry.Length) { throw 'Evidence extent mismatch.' }
    } finally { $stream.Dispose(); $memory.Dispose() }
} finally { $archive.Dispose() }
$output = [IO.Path]::Combine($cache, 'qualification-reviewed-' + $Platform + '-' + $ExpectedZipSha.Substring(0,12).ToLowerInvariant() + '.json')
[IO.File]::WriteAllBytes($output, $bytes)
& node ([IO.Path]::Combine($PSScriptRoot, 'review-evidence.mjs')) $output $Platform $ExpectedTree
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
[ordered]@{zipSha256=$ExpectedZipSha.ToLowerInvariant();recordSha256=(Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()} | ConvertTo-Json
