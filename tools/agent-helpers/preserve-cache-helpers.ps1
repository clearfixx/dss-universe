#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: Agent Helper Preservation
📄 File: tools/agent-helpers/preserve-cache-helpers.ps1

🎯 Purpose:
Moves authored cache helpers into a durable, checksum-verified project archive.

🧠 Responsibilities:
• inventories explicit worktree caches without following reparse points;
• checks all destinations and source hashes before moving individual files;
• preserves original bytes and records a portable manifest.

🏗️ Architecture:
Opt-in maintenance tool; never executes archived scripts or changes Git branches.

⚠️ Important:
Default mode is read-only. Apply performs only individually bounded file moves.
Generated browser/transformation assets and reports remain in cache.

🚀 Build. Share. Grow.
===============================================================
#>
param(
    [Parameter(Mandatory)][hashtable]$Sources,
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$archiveRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'archive'))
$comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
$extensions = @('.ps1','.psm1','.py','.js','.mjs','.cjs','.ts','.tsx','.sh','.cmd','.bat','.cs','.cpp','.cc')
$generated = '(^|[/\\])(playwright-browsers|playwright-transform-cache|lcov-report|coverage|\.next|test-results|playwright-report)([/\\]|$)'
$plan = [Collections.Generic.List[object]]::new()
$skipped = [Collections.Generic.List[object]]::new()

function Assert-Within([string]$Path, [string]$Root) {
    $full = [IO.Path]::GetFullPath($Path)
    $prefix = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $full.StartsWith($prefix, $comparison)) { throw 'Path escaped the explicitly named root.' }
    return $full
}

foreach ($label in @($Sources.Keys | Sort-Object)) {
    if ($label -notmatch '^[a-z0-9-]+$') { throw 'Invalid source label.' }
    $worktree = [IO.Path]::GetFullPath([string]$Sources[$label])
    $packagePath = Join-Path $worktree 'package.json'
    if (-not (Test-Path -LiteralPath $packagePath)) { throw 'Source is not a project worktree.' }
    if ((Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json).name -ne 'dss-universe') { throw 'Unexpected source project.' }
    $cache = Assert-Within (Join-Path $worktree 'node_modules/.cache') $worktree
    if (-not (Test-Path -LiteralPath $cache)) { continue }
    foreach ($boundary in @((Join-Path $worktree 'node_modules'), $cache)) {
        if (([IO.File]::GetAttributes($boundary) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'A source boundary is a reparse point.' }
    }
    $stack = [Collections.Generic.Stack[string]]::new()
    $stack.Push($cache)
    while ($stack.Count -gt 0) {
        foreach ($item in [IO.Directory]::EnumerateFileSystemEntries($stack.Pop())) {
            $source = Assert-Within $item $cache
            $relative = [IO.Path]::GetRelativePath($cache, $source).Replace('\','/')
            $attributes = [IO.File]::GetAttributes($source)
            if (($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
            if ($relative -match $generated) { $skipped.Add(@{source=$label;path=$relative;reason='generated'}); continue }
            if (($attributes -band [IO.FileAttributes]::Directory) -ne 0) { $stack.Push($source); continue }
            if ([IO.Path]::GetExtension($source).ToLowerInvariant() -notin $extensions) { continue }
            $text = [IO.File]::ReadAllText($source)
            if ($text -match '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16}|eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}') {
                throw "Credential signature requires private review: $label/$relative"
            }
            $targetRelative = "$label/$relative"
            $target = Assert-Within (Join-Path $archiveRoot $targetRelative) $archiveRoot
            if (Test-Path -LiteralPath $target) { throw 'Archive destination already exists; no overwrite is allowed.' }
            $plan.Add([ordered]@{source=$label;path=$relative;archivePath="archive/$targetRelative";bytes=(Get-Item -LiteralPath $source).Length;sha256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant();sourceAbsolute=$source;targetAbsolute=$target;cacheAbsolute=$cache})
        }
    }
}

if (-not $Apply) {
    [ordered]@{count=$plan.Count;entries=$plan.ToArray();generated=$skipped.ToArray()} | ConvertTo-Json -Depth 7
    exit 0
}
if ($plan.Count -eq 0) { throw 'No authored helper files found.' }
$manifestPath = Join-Path $PSScriptRoot 'archive-manifest.json'
if (Test-Path -LiteralPath $manifestPath) { throw 'Manifest already exists; preserve the previous migration.' }
# Every source and target has been checked before the first mutation.
foreach ($entry in $plan) {
    $null = Assert-Within $entry.sourceAbsolute $entry.cacheAbsolute
    $null = Assert-Within $entry.targetAbsolute $archiveRoot
    if ((Get-FileHash -LiteralPath $entry.sourceAbsolute -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'Source changed during planning.' }
}
$plan | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'migration-plan.local.json') -Encoding utf8NoBOM
foreach ($entry in $plan) {
    $parent = [IO.Path]::GetDirectoryName($entry.targetAbsolute)
    $null = [IO.Directory]::CreateDirectory($parent)
    $null = Assert-Within $entry.targetAbsolute $archiveRoot
    if (Test-Path -LiteralPath $entry.targetAbsolute) { throw 'Destination appeared during migration.' }
    Move-Item -LiteralPath $entry.sourceAbsolute -Destination $entry.targetAbsolute
    if ((Get-FileHash -LiteralPath $entry.targetAbsolute -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'Moved bytes do not match source checksum.' }
}
$entries = @($plan | ForEach-Object { [ordered]@{source=$_.source;path=$_.path;archivePath=$_.archivePath;bytes=$_.bytes;sha256=$_.sha256} })
[ordered]@{version=1;createdAtUtc=[DateTime]::UtcNow.ToString('o');entries=$entries} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $manifestPath -Encoding utf8NoBOM
[ordered]@{moved=$entries.Count;manifest=$manifestPath;generatedLocationsLeftInCache=$skipped.Count} | ConvertTo-Json
exit 0
