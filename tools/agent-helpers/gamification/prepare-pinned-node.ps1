#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Local C2.1 Toolchain Recovery
📄 File: tools/agent-helpers/gamification/prepare-pinned-node.ps1
🎯 Purpose: Restores an isolated copy of the repository-pinned Windows Node binary.
🧠 Responsibilities: Verifies the official SHA-256 and leaves global tools unchanged.
🏗️ Architecture: Local helper; downloads runtime artifacts, never application dependencies.
⚠️ Important: The artifact cache may be rebuilt; this script remains in the project.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
$c21Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$c21Version = (Get-Content (Join-Path $c21Root '.node-version') -Raw).Trim()
if ($c21Version -cne '24.18.0') { throw 'Review toolchain recovery for the new repository pin.' }
$c21Artifact = Join-Path $c21Root 'node_modules/.cache/c21-node24'
[IO.Directory]::CreateDirectory($c21Artifact) | Out-Null
$c21Base = 'https://nodejs.org/dist/v' + $c21Version
$c21Sums = (Invoke-WebRequest -Uri ($c21Base + '/SHASUMS256.txt')).Content
$c21Match = [regex]::Match($c21Sums, '(?m)^([a-f0-9]{64})\s+win-x64/node\.exe\s*$')
if (-not $c21Match.Success) { throw 'Official binary checksum missing.' }
$c21Node = Join-Path $c21Artifact 'node.exe'
if (-not (Test-Path -LiteralPath $c21Node) -or (Get-FileHash -LiteralPath $c21Node -Algorithm SHA256).Hash.ToLowerInvariant() -cne $c21Match.Groups[1].Value) {
    Invoke-WebRequest -Uri ($c21Base + '/win-x64/node.exe') -OutFile $c21Node
}
if ((Get-FileHash -LiteralPath $c21Node -Algorithm SHA256).Hash.ToLowerInvariant() -cne $c21Match.Groups[1].Value) { throw 'Downloaded Node checksum mismatch; binary not executed.' }
$c21Actual = (& $c21Node --version).Trim()
if ($LASTEXITCODE -ne 0 -or $c21Actual -cne ('v' + $c21Version)) { throw 'Pinned runtime version mismatch.' }
[ordered]@{ source=$c21Base; version=$c21Actual; sha256=$c21Match.Groups[1].Value; globalToolsChanged=$false } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $c21Root 'tools/agent-helpers/debt007-c21-pinned-node.local.json')
Write-Host "Verified isolated Node $c21Actual; global installation unchanged."
