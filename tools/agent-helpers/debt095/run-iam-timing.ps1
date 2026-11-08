#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: IAM Timing Investigation
📄 File: tools/agent-helpers/debt095/run-iam-timing.ps1

🎯 Purpose:
Retains one real IAM scenario observation with opt-in owner/clock timing.

🧠 Responsibilities:
• pins the source and reads credentials from disposable compose configuration;
• runs the original assertions and deadline once, preserving unique evidence;
• never installs services, resets data, changes power settings or retries tests.

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
$env:DSS_IAM_E2E_DIAGNOSTIC = '1'
$nonce = [Guid]::NewGuid().ToString('N')
$cache = [IO.Path]::Combine($root, 'node_modules', '.cache')
[IO.Directory]::CreateDirectory($cache) | Out-Null
$log = [IO.Path]::Combine($cache, 'debt095-' + $nonce + '.log')
$report = [IO.Path]::Combine($cache, 'debt095-' + $nonce + '-jest.json')
$env:DSS_IAM_E2E_REPORT = [IO.Path]::Combine($cache, 'debt095-' + $nonce + '-timings.json')
$receipt = [IO.Path]::Combine($root, 'tools', 'agent-helpers', 'debt095-' + $nonce + '.local.json')
$started = [DateTime]::UtcNow.ToString('o')
$code = 1
try {
    Write-Host "IAM timing log: $log"
    & pnpm --filter @dss/api test:e2e --runTestsByPath test/app.e2e-spec.ts --testNamePattern '^DSS API \(e2e\) manages IAM permissions through the owned repository and rolls back failed audit$' --json "--outputFile=$report" *> $log
    $code = $LASTEXITCODE
} finally {
    [ordered]@{
        startedHead = $head; endedHead = (& git rev-parse HEAD).Trim()
        startedAt = $started; endedAt = [DateTime]::UtcNow.ToString('o')
        exitCode = $code; log = $log; report = $report; timings = $env:DSS_IAM_E2E_REPORT
        scope = 'One focused case; excluded cases are not a full-gate result.'
    } | ConvertTo-Json | Set-Content -LiteralPath $receipt
}
exit $code
