#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: P1 Local Verification
📄 File: tools/agent-helpers/debt090/run-producer-tests.ps1
🎯 Purpose: Repeats focused producer checks against prepared disposable services.
🧠 Responsibilities: Keeps credentials private and preserves each actual run's evidence.
🏗️ Architecture: Agent helper; fixed tests, no provisioning, reset, retry or timeout override.
🚀 Build. Share. Grow.
===============================================================
#>
param([ValidateSet('unit', 'e2e')][string]$Kind = 'e2e')
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, '..', '..', '..'))
Set-Location -LiteralPath $root
$credential = [regex]::Match((Get-Content -LiteralPath docker-compose.test.yml -Raw), '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $credential.Success) { throw 'Disposable compose credential missing.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($credential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$nonce = [Guid]::NewGuid().ToString('N')
$log = [IO.Path]::Combine($root, 'node_modules', '.cache', "debt090-p1-$Kind-$nonce.log")
$receipt = [IO.Path]::Combine($PSScriptRoot, "producer-$Kind-$nonce.local.json")
$started = [DateTime]::UtcNow.ToString('o')
$head = (& git rev-parse HEAD).Trim()
$code = 1
try {
    Write-Host "Focused $Kind log: $log"
    if ($Kind -eq 'unit') {
        & pnpm --filter @dss/api exec jest --runInBand --runTestsByPath src/core/events/infrastructure/canonical-outbox.reader.spec.ts src/composition/reputation/infrastructure/reputation-write-boundaries.spec.ts *> $log
    } else {
        & pnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/reputation-qualification.e2e-spec.ts test/reputation-qualification-storage.e2e-spec.ts test/reputation-write-ownership.e2e-spec.ts test/reputation-producer-facts-characterization.e2e-spec.ts test/prisma-schema-alignment.e2e-spec.ts *> $log
    }
    $code = $LASTEXITCODE
} finally {
    [ordered]@{ kind=$Kind; head=$head; trackedDiff=(& git diff --stat | Out-String).Trim(); startedAt=$started; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$code; log=$log } | ConvertTo-Json | Set-Content -LiteralPath $receipt
}
exit $code
