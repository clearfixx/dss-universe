#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: Community Points Timing Investigation
📄 File: tools/agent-helpers/debt093/run-points-timing.ps1

🎯 Purpose:
Retains a real isolated ledger E2E observation with opt-in stage timings.

🧠 Responsibilities:
• checks source identity and reads disposable compose credentials;
• runs the unchanged-timeout real scenario once per invocation;
• preserves logs, Jest JSON and a unique execution receipt.

🏗️ Architecture:
Diagnostic orchestration only; no application imports or production changes.

⚠️ Important:
No Auth mocks, database reset, sleep, retry loop or assertion weakening.

🚀 Build. Share. Grow.
===============================================================
#>
param([Parameter(Mandatory)][string]$ExpectedHead)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, '..', '..', '..'))
Set-Location -LiteralPath $root
$head = (& git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $head -cne $ExpectedHead) { throw 'Unexpected source HEAD.' }
$compose = Get-Content -LiteralPath docker-compose.test.yml -Raw
$password = [regex]::Match($compose, '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $password.Success) { throw 'Disposable compose credential missing.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($password.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:NODE_ENV = 'test'
$env:DSS_POINTS_E2E_TIMINGS = '1'
$nonce = [Guid]::NewGuid().ToString('N')
$cache = [IO.Path]::Combine($root, 'node_modules', '.cache')
[IO.Directory]::CreateDirectory($cache) | Out-Null
$log = [IO.Path]::Combine($cache, 'debt093-' + $nonce + '.log')
$report = [IO.Path]::Combine($cache, 'debt093-' + $nonce + '.json')
$receipt = [IO.Path]::Combine($root, 'tools', 'agent-helpers', 'debt093-' + $nonce + '.local.json')
$started = [DateTime]::UtcNow.ToString('o')
$code = 1
try {
    Write-Host "Timing log: $log"
    & pnpm --filter @dss/api test:e2e --runTestsByPath test/community-points-ledger.e2e-spec.ts --json "--outputFile=$report" *> $log
    $code = $LASTEXITCODE
} finally {
    [ordered]@{
        startedHead = $head; endedHead = (& git rev-parse HEAD).Trim()
        startedAt = $started; endedAt = [DateTime]::UtcNow.ToString('o')
        exitCode = $code; log = $log; report = $report
    } | ConvertTo-Json | Set-Content -LiteralPath $receipt
}
exit $code
