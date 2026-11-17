#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Points Source Ordering Verification
📄 File: tools/agent-helpers/gamification/run-c22-points-verification.ps1
🎯 Purpose: Runs current source-guard regressions; PR161 retains the original characterization.
🧠 Responsibilities: Pins Node and prepared disposable endpoints without logging credentials.
🏗️ Architecture: Local test helper; no provisioning, reset, activation or retries.
⚠️ Important: Synthetic events are not canonical producer or HTTP evidence.
🚀 Build. Share. Grow.
===============================================================
#>
param([ValidateSet('focused','regression')][string]$Kind = 'focused')
$ErrorActionPreference = 'Stop'
$pointsRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $pointsRoot
$pointsNode = Join-Path $pointsRoot 'node_modules/.cache/c21-node24'
if ((& (Join-Path $pointsNode 'node.exe') --version).Trim() -cne 'v24.22.3') { throw 'Unexpected Node runtime.' }
$env:PATH = $pointsNode + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$pointsCredential = [regex]::Match((Get-Content docker-compose.test.yml -Raw), '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $pointsCredential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($pointsCredential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:OUTBOX_DISPATCH_INTERVAL_MS = '0'
$env:MEDIA_CLEANUP_INTERVAL_MS = '0'
$pointsNonce = [Guid]::NewGuid().ToString('N')
$pointsLog = Join-Path $pointsRoot ('node_modules/.cache/debt007-c22-points-source-guard-' + $Kind + '-' + $pointsNonce + '.log')
$pointsReceipt = Join-Path $pointsRoot ('tools/agent-helpers/debt007-c22-points-source-guard-' + $Kind + '-' + $pointsNonce + '.local.json')
$pointsStart = [DateTime]::UtcNow.ToString('o')
$pointsCode = 1
try {
    Write-Host "Points $Kind verification log: $pointsLog"
    $pointsSuites = @('test/community-points-source-synchronization.e2e-spec.ts')
    if ($Kind -eq 'regression') { $pointsSuites += @('test/community-points-cap-audit.e2e-spec.ts', 'test/community-points-ledger.e2e-spec.ts') }
    & pnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath @pointsSuites *> $pointsLog
    $pointsCode = $LASTEXITCODE
} finally {
    [ordered]@{ head=(& git rev-parse HEAD).Trim(); kind=$Kind; startedAt=$pointsStart; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$pointsCode; log=$pointsLog; node='24.22.3'; workingStatus=(& git status --porcelain | Out-String).Trim() } |
        ConvertTo-Json | Set-Content -LiteralPath $pointsReceipt
}
exit $pointsCode
