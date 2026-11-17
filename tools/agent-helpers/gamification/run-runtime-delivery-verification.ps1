#requires -Version 7.0
param([ValidateSet('check','unit','db','build','broker','activation')][string]$Kind = 'check')
$ErrorActionPreference = 'Stop'
$deliveryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $deliveryRoot
$deliveryNode = Join-Path $deliveryRoot 'node_modules/.cache/c21-node24'
if ((& (Join-Path $deliveryNode 'node.exe') --version).Trim() -cne 'v24.22.3') { throw 'Unexpected Node runtime.' }
$env:PATH = $deliveryNode + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$deliveryPnpm = Join-Path $PSScriptRoot 'bin/pnpm.cmd'
$deliveryCredential = [regex]::Match((Get-Content docker-compose.test.yml -Raw),'(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $deliveryCredential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($deliveryCredential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:OUTBOX_DISPATCH_INTERVAL_MS = '0'
$env:MEDIA_CLEANUP_INTERVAL_MS = '0'
$deliveryLog = Join-Path $deliveryRoot ('node_modules/.cache/runtime-delivery-' + $Kind + '-' + [Guid]::NewGuid().ToString('N') + '.log')
Write-Host "Runtime delivery verification log: $deliveryLog"
if ($Kind -eq 'check') {
  & $deliveryPnpm --filter @dss/api typecheck *> $deliveryLog
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $deliveryPnpm --filter @dss/api exec eslint src/composition/gamification-delivery src/gamification-main.ts src/modules/community-points/infrastructure/repositories/prisma-point-rule-configuration.reader.ts src/modules/achievements/infrastructure/repositories/prisma-achievement-rule-configuration.reader.ts test/gamification-runtime-operations.e2e-spec.ts test/gamification-broker.e2e-spec.ts test/gamification-activation.e2e-spec.ts --max-warnings=0 >> $deliveryLog 2>&1
  exit $LASTEXITCODE
}
if ($Kind -eq 'unit') {
  & $deliveryPnpm --filter @dss/api exec jest --runInBand --runTestsByPath src/composition/gamification-delivery/application/gamification-coordinator.spec.ts src/composition/gamification-delivery/application/delivery-pump.spec.ts src/composition/gamification-delivery/infrastructure/gamification-broker.spec.ts src/composition/gamification-delivery/infrastructure/consumption-validation.spec.ts src/composition/gamification-delivery/gamification-runtime.module.spec.ts >> $deliveryLog 2>&1
  exit $LASTEXITCODE
}
if ($Kind -eq 'broker') {
  & $deliveryPnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/gamification-broker.e2e-spec.ts >> $deliveryLog 2>&1
  exit $LASTEXITCODE
}
if ($Kind -eq 'activation') {
  & $deliveryPnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/gamification-activation.e2e-spec.ts >> $deliveryLog 2>&1
  exit $LASTEXITCODE
}
if ($Kind -eq 'build') {
  & $deliveryPnpm --filter @dss/api build *> $deliveryLog
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $env:DSS_GAMIFICATION_ENABLED = '0'
  $deliveryDisabled = & (Join-Path $deliveryNode 'node.exe') apps/api/dist/src/gamification-main.js 2>&1
  $deliveryDisabled >> $deliveryLog
  if ($LASTEXITCODE -ne 0 -or ($deliveryDisabled -join "`n").Trim() -cne 'Gamification runtime is disabled.') { throw 'Built disabled entrypoint did not exit cleanly.' }
  exit 0
}
& $deliveryPnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/gamification-runtime-operations.e2e-spec.ts test/gamification-activation.e2e-spec.ts test/gamification-broker.e2e-spec.ts test/gamification-producers.e2e-spec.ts test/gamification-consumption-assembly.e2e-spec.ts test/gamification-admission.e2e-spec.ts test/gamification-consumption.e2e-spec.ts test/gamification-consumption-storage.e2e-spec.ts test/gamification-consumption-performance.e2e-spec.ts >> $deliveryLog 2>&1
exit $LASTEXITCODE
