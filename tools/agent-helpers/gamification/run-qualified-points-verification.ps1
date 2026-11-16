#requires -Version 7.0
<# DSS Universe — qualified Points verification with fixed disposable endpoints.
No reset, service provisioning, activation, dependency update or credential output.
Migration generation is refused when the new migration file already exists.
#>
param([ValidateSet('migration','generate','prepare','check','unit','owner','focused')][string]$Kind = 'focused')
$ErrorActionPreference = 'Stop'
$qualifiedRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $qualifiedRoot
$qualifiedNode = Join-Path $qualifiedRoot 'node_modules/.cache/c21-node24'
if ((& (Join-Path $qualifiedNode 'node.exe') --version).Trim() -cne 'v24.18.0') { throw 'Unexpected Node runtime.' }
$env:PATH = $qualifiedNode + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$qualifiedPnpm = Join-Path $PSScriptRoot 'bin/pnpm.cmd'
$qualifiedCredential = [regex]::Match((Get-Content docker-compose.test.yml -Raw),'(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $qualifiedCredential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($qualifiedCredential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:OUTBOX_DISPATCH_INTERVAL_MS = '0'
$env:MEDIA_CLEANUP_INTERVAL_MS = '0'
$qualifiedLog = Join-Path $qualifiedRoot ('node_modules/.cache/qualified-points-' + $Kind + '-' + [Guid]::NewGuid().ToString('N') + '.log')
Write-Host "Qualified Points verification log: $qualifiedLog"
if ($Kind -eq 'migration') {
    $qualifiedMigration = Join-Path $qualifiedRoot 'apps/api/prisma/migrations/20261116070000_add_qualified_points_facets/migration.sql'
    if (Test-Path -LiteralPath $qualifiedMigration) { throw 'Refusing to overwrite an existing migration.' }
    New-Item -ItemType Directory -Path (Split-Path $qualifiedMigration -Parent) -ErrorAction Stop | Out-Null
    & $qualifiedPnpm --filter @dss/api exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output $qualifiedMigration *> $qualifiedLog
    exit $LASTEXITCODE
}
if ($Kind -eq 'prepare' -or $Kind -eq 'generate') {
    $qualifiedTasks = @('db:validate','db:generate')
    if ($Kind -eq 'prepare') { $qualifiedTasks += 'db:deploy' }
    foreach ($qualifiedTask in $qualifiedTasks) {
        & $qualifiedPnpm --filter @dss/api $qualifiedTask >> $qualifiedLog 2>&1
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    if ($Kind -eq 'generate') { exit 0 }
    & $qualifiedPnpm db:check-drift >> $qualifiedLog 2>&1
    exit $LASTEXITCODE
}
if ($Kind -eq 'check') {
    & $qualifiedPnpm --filter @dss/api typecheck *> $qualifiedLog
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $qualifiedPnpm --filter @dss/api exec eslint src/modules/community-points --max-warnings=0 >> $qualifiedLog 2>&1
    exit $LASTEXITCODE
}
if ($Kind -eq 'unit') {
    & $qualifiedPnpm --filter @dss/api exec jest --runInBand --runTestsByPath src/modules/community-points/application/services/qualified-points.service.spec.ts src/modules/community-points/domain/qualified-points.validation.spec.ts src/modules/community-points/application/services/community-points.service.spec.ts src/composition/gamification/gamification-runtime-assembly.spec.ts src/composition/gamification/gamification-module-boundaries.spec.ts *> $qualifiedLog
    exit $LASTEXITCODE
}
$qualifiedSuites = @('test/qualified-points.e2e-spec.ts','test/community-points-source-synchronization.e2e-spec.ts','test/community-points-cap-audit.e2e-spec.ts','test/prisma-schema-alignment.e2e-spec.ts')
# Owner fixtures run all migrations in their own schemas before public preparation.
# The existing HTTP suite still runs in the complete focused profile after prepare.
if ($Kind -eq 'focused') { $qualifiedSuites += 'test/community-points-ledger.e2e-spec.ts' }
& $qualifiedPnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath @qualifiedSuites >> $qualifiedLog 2>&1
exit $LASTEXITCODE
