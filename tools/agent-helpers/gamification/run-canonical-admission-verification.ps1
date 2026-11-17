#requires -Version 7.0
param([ValidateSet('check','unit','owner','prepare')][string]$Kind = 'check')
$ErrorActionPreference = 'Stop'
$admissionRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $admissionRoot
$admissionNode = Join-Path $admissionRoot 'node_modules/.cache/c21-node24'
if ((& (Join-Path $admissionNode 'node.exe') --version).Trim() -cne 'v24.22.3') { throw 'Unexpected Node runtime.' }
$env:PATH = $admissionNode + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$admissionPnpm = Join-Path $PSScriptRoot 'bin/pnpm.cmd'
$admissionCredential = [regex]::Match((Get-Content docker-compose.test.yml -Raw),'(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $admissionCredential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($admissionCredential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:OUTBOX_DISPATCH_INTERVAL_MS = '0'
$env:MEDIA_CLEANUP_INTERVAL_MS = '0'
$admissionLog = Join-Path $admissionRoot ('node_modules/.cache/canonical-admission-' + $Kind + '-' + [Guid]::NewGuid().ToString('N') + '.log')
Write-Host "Canonical admission verification log: $admissionLog"
if ($Kind -eq 'prepare') {
    foreach ($admissionTask in @('db:validate','db:generate','db:deploy')) {
        & $admissionPnpm --filter @dss/api $admissionTask >> $admissionLog 2>&1
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    & $admissionPnpm db:check-drift >> $admissionLog 2>&1
    exit $LASTEXITCODE
}
if ($Kind -eq 'check') {
    & $admissionPnpm --filter @dss/api typecheck *> $admissionLog
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $admissionPnpm --filter @dss/api exec eslint src/composition/gamification-delivery src/composition/reputation src/modules/community-points/contracts/qualified-points-validation.contract.ts test/gamification-admission.e2e-spec.ts --max-warnings=0 >> $admissionLog 2>&1
    exit $LASTEXITCODE
}
if ($Kind -eq 'unit') {
    & $admissionPnpm --filter @dss/api exec jest --runInBand --runTestsByPath src/composition/gamification-delivery/infrastructure/admission-seal.codec.spec.ts src/composition/gamification-delivery/infrastructure/consumption-validation.spec.ts src/composition/gamification/gamification-module-boundaries.spec.ts src/modules/community-points/contracts/qualified-points-validation.contract.spec.ts *> $admissionLog
    exit $LASTEXITCODE
}
& $admissionPnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/gamification-admission.e2e-spec.ts test/gamification-consumption.e2e-spec.ts test/gamification-consumption-storage.e2e-spec.ts test/gamification-consumption-performance.e2e-spec.ts test/gamification-consumption-assembly.e2e-spec.ts test/reputation-qualification.e2e-spec.ts test/reputation-qualification-storage.e2e-spec.ts test/qualified-points.e2e-spec.ts >> $admissionLog 2>&1
exit $LASTEXITCODE
