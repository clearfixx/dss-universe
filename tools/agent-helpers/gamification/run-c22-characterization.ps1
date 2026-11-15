#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Local C2.2 Ordering Verification
📄 File: tools/agent-helpers/gamification/run-c22-characterization.ps1
🎯 Purpose: Runs current owner-ordering regressions; PR154 retains the original characterization.
🧠 Responsibilities: Pins tools and retains each independent result.
🏗️ Architecture: Helper only; no reset, activation, retries or timeout override.
⚠️ Important: Synthetic profiles are not proof of login or authorization.
🚀 Build. Share. Grow.
===============================================================
#>
param([ValidateSet('unit','db')][string]$Kind = 'db')
$ErrorActionPreference = 'Stop'
$c22Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $c22Root
$c22NodeDirectory = Join-Path $c22Root 'node_modules/.cache/c21-node24'
if ((& (Join-Path $c22NodeDirectory 'node.exe') --version).Trim() -cne 'v24.18.0') { throw 'Unexpected Node runtime.' }
$env:PATH = $c22NodeDirectory + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$c22Credential = [regex]::Match((Get-Content docker-compose.test.yml -Raw), '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $c22Credential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($c22Credential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:OUTBOX_DISPATCH_INTERVAL_MS = '0'
$env:MEDIA_CLEANUP_INTERVAL_MS = '0'
$c22Nonce = [Guid]::NewGuid().ToString('N')
$c22Log = Join-Path $c22Root ('node_modules/.cache/debt007-c22-ordering-' + $Kind + '-' + $c22Nonce + '.log')
$c22Receipt = Join-Path $c22Root ('tools/agent-helpers/debt007-c22-ordering-' + $Kind + '-' + $c22Nonce + '.local.json')
$c22Start = [DateTime]::UtcNow.ToString('o')
$c22Code = 1
try {
    Write-Host "C2.2 $Kind ordering log: $c22Log"
    if ($Kind -eq 'unit') {
        & pnpm --filter @dss/api exec jest --runInBand --runTestsByPath src/modules/levels/application/services/levels.service.spec.ts src/composition/gamification/infrastructure/prisma-level-synchronization.transaction.spec.ts src/composition/gamification/gamification-runtime-assembly.spec.ts *> $c22Log
    } else {
        & pnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/levels-synchronization.e2e-spec.ts test/levels-foundation.e2e-spec.ts test/gamification-runtime-assembly.e2e-spec.ts test/gamification-consumption-assembly.e2e-spec.ts *> $c22Log
    }
    $c22Code = $LASTEXITCODE
} finally {
    [ordered]@{ head=(& git rev-parse HEAD).Trim(); kind=$Kind; startedAt=$c22Start; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$c22Code; log=$c22Log; node='24.18.0'; workingStatus=(& git status --porcelain | Out-String).Trim() } |
        ConvertTo-Json | Set-Content -LiteralPath $c22Receipt
}
exit $c22Code
