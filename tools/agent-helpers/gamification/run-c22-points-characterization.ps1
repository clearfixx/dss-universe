#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Points Source Ordering Verification
📄 File: tools/agent-helpers/gamification/run-c22-points-characterization.ps1
🎯 Purpose: Runs real owner DB characterization and retains its unique receipt.
🧠 Responsibilities: Pins Node and prepared disposable endpoints without logging credentials.
🏗️ Architecture: Local test helper; no provisioning, reset, activation or retries.
⚠️ Important: Synthetic events are not canonical producer or HTTP evidence.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
$pointsRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $pointsRoot
$pointsNode = Join-Path $pointsRoot 'node_modules/.cache/c21-node24'
if ((& (Join-Path $pointsNode 'node.exe') --version).Trim() -cne 'v24.18.0') { throw 'Unexpected Node runtime.' }
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
$pointsLog = Join-Path $pointsRoot ('node_modules/.cache/debt007-c22-points-source-' + $pointsNonce + '.log')
$pointsReceipt = Join-Path $pointsRoot ('tools/agent-helpers/debt007-c22-points-source-' + $pointsNonce + '.local.json')
$pointsStart = [DateTime]::UtcNow.ToString('o')
$pointsCode = 1
try {
    Write-Host "Points characterization log: $pointsLog"
    & pnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/community-points-source-order.characterization.e2e-spec.ts *> $pointsLog
    $pointsCode = $LASTEXITCODE
} finally {
    [ordered]@{ head=(& git rev-parse HEAD).Trim(); startedAt=$pointsStart; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$pointsCode; log=$pointsLog; node='24.18.0'; workingStatus=(& git status --porcelain | Out-String).Trim() } |
        ConvertTo-Json | Set-Content -LiteralPath $pointsReceipt
}
exit $pointsCode
