#requires -Version 7.0
param([ValidateSet('check','unit','owner','source')][string]$Kind = 'check')
$ErrorActionPreference = 'Stop'
$producerRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $producerRoot
$producerNode = Join-Path $producerRoot 'node_modules/.cache/c21-node24'
if ((& (Join-Path $producerNode 'node.exe') --version).Trim() -cne 'v24.22.3') { throw 'Unexpected Node runtime.' }
$env:PATH = $producerNode + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$producerPnpm = Join-Path $PSScriptRoot 'bin/pnpm.cmd'
$producerCredential = [regex]::Match((Get-Content docker-compose.test.yml -Raw),'(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $producerCredential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($producerCredential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:OUTBOX_DISPATCH_INTERVAL_MS = '0'
$env:MEDIA_CLEANUP_INTERVAL_MS = '0'
$producerLog = Join-Path $producerRoot ('node_modules/.cache/producer-coverage-' + $Kind + '-' + [Guid]::NewGuid().ToString('N') + '.log')
Write-Host "Producer coverage verification log: $producerLog"
if ($Kind -eq 'check') {
  & $producerPnpm --filter @dss/api typecheck *> $producerLog
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $producerPnpm --filter @dss/api exec eslint src/composition/gamification src/composition/gamification-delivery src/composition/reputation src/core/events/infrastructure src/modules/community-points src/modules/achievements src/modules/interactions/infrastructure/repositories/prisma-comment.writer.ts src/modules/interactions/infrastructure/repositories/prisma-comment.writer.spec.ts src/modules/interactions/infrastructure/repositories/prisma-comment-lifetime.reader.ts src/modules/news/infrastructure/repositories/prisma-publication-evidence.reader.ts test/gamification-producers.e2e-spec.ts --max-warnings=0 >> $producerLog 2>&1
  exit $LASTEXITCODE
}
if ($Kind -eq 'unit') {
  & $producerPnpm --filter @dss/api exec jest --runInBand --runTestsByPath src/composition/gamification-delivery/infrastructure/admission-seal.codec.spec.ts src/composition/gamification/gamification-runtime-assembly.spec.ts src/composition/gamification/gamification-module-boundaries.spec.ts src/modules/interactions/infrastructure/repositories/prisma-comment.writer.spec.ts src/modules/community-points/application/services/community-points.service.spec.ts src/modules/achievements/application/services/achievements.service.spec.ts src/core/events/infrastructure/canonical-outbox.reader.spec.ts *> $producerLog
  exit $LASTEXITCODE
}
if ($Kind -eq 'source') {
  & $producerPnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/gamification-producers.e2e-spec.ts >> $producerLog 2>&1
  exit $LASTEXITCODE
}
& $producerPnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/gamification-producers.e2e-spec.ts test/gamification-admission.e2e-spec.ts test/gamification-consumption-assembly.e2e-spec.ts test/gamification-routing-persistence.e2e-spec.ts test/gamification-routing-query-work.e2e-spec.ts test/qualified-points.e2e-spec.ts test/achievement-award-atomicity.e2e-spec.ts >> $producerLog 2>&1
exit $LASTEXITCODE
