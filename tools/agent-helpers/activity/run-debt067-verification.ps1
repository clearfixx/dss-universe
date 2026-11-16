#requires -Version 7.0
<# DSS Universe: bounded Activity ordering verification.
Uses existing pinned tools and disposable services; no service or data reset.
Credentials are read from local configuration and never printed.
#>
param([ValidateSet('focused','prepare','full')][string]$Kind = 'focused')
$ErrorActionPreference = 'Stop'
$activityRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $activityRoot
$activityNode = Join-Path $activityRoot 'node_modules/.cache/c21-node24'
if ((& (Join-Path $activityNode 'node.exe') --version).Trim() -cne 'v24.18.0') { throw 'Unexpected pinned Node runtime.' }
$env:PATH = $activityNode + ';' + (Join-Path $activityRoot 'tools/agent-helpers/gamification/bin') + ';' + $env:PATH
$activityCredential = [regex]::Match((Get-Content docker-compose.test.yml -Raw), '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $activityCredential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($activityCredential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:OUTBOX_DISPATCH_INTERVAL_MS = '0'
$env:MEDIA_CLEANUP_INTERVAL_MS = '0'
$activityLog = Join-Path $activityRoot ('node_modules/.cache/debt067-' + $Kind + '-' + [Guid]::NewGuid().ToString('N') + '.log')
Write-Host "Activity verification log: $activityLog"
if ($Kind -eq 'prepare') {
    & pnpm --filter @dss/api db:validate *> $activityLog
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & pnpm --filter @dss/api db:generate >> $activityLog 2>&1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & pnpm --filter @dss/api db:deploy >> $activityLog 2>&1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & pnpm db:check-drift >> $activityLog 2>&1
    exit $LASTEXITCODE
}
if ($Kind -eq 'full') {
    $env:DSS_WEB_TEST_PORT = '3195'
    $activityStart = [DateTime]::UtcNow.ToString('o')
    $activityHead = (& git rev-parse HEAD).Trim()
    $activityCode = 1
    try {
        & pnpm quality:full *> $activityLog
        $activityCode = $LASTEXITCODE
    } finally {
        $activityReceipt = Join-Path (Split-Path $PSScriptRoot -Parent) ('debt067-full-' + [Guid]::NewGuid().ToString('N') + '.local.json')
        [ordered]@{ head=$activityHead; startedAt=$activityStart; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$activityCode; log=$activityLog; node='24.18.0' } |
            ConvertTo-Json | Set-Content -LiteralPath $activityReceipt
        Write-Host "Activity full receipt: $activityReceipt"
    }
    exit $activityCode
}
$activitySteps = @(
    @('--filter','@dss/worker','test'),
    @('--filter','@dss/worker','typecheck'),
    @('--filter','@dss/worker','lint'),
    @('--filter','@dss/api','exec','jest','--config','test/jest-e2e.json','--runInBand','--runTestsByPath','test/core-worker-delivery-boundary.e2e-spec.ts','test/prisma-schema-alignment.e2e-spec.ts')
)
foreach ($activityStep in $activitySteps) {
    & pnpm @activityStep >> $activityLog 2>&1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
exit 0
