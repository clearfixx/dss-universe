#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Local C2.1 Verification
📄 File: tools/agent-helpers/gamification/run-c21-tests.ps1
🎯 Purpose: Runs fixed C2.1 tests with the isolated repository-pinned runtime.
🧠 Responsibilities: Preserves each result and targets only disposable PostgreSQL.
🏗️ Architecture: Local helper, no reset, retry, timeout or global tool changes.
⚠️ Important: Storage tests use owned migrated schemas, not the public schema.
🚀 Build. Share. Grow.
===============================================================
#>
param([ValidateSet('storage','codec')][string]$Kind = 'storage')
$ErrorActionPreference = 'Stop'
$c21Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $c21Root
$c21NodeDirectory = Join-Path $c21Root 'node_modules/.cache/c21-node24'
$c21Node = Join-Path $c21NodeDirectory 'node.exe'
if (-not (Test-Path -LiteralPath $c21Node)) { throw 'Run prepare-pinned-node.ps1 first.' }
if ((& $c21Node --version).Trim() -cne 'v24.18.0') { throw 'Unexpected Node runtime.' }
$env:PATH = $c21NodeDirectory + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$c21Credential = [regex]::Match((Get-Content docker-compose.test.yml -Raw), '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $c21Credential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($c21Credential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$c21Nonce = [Guid]::NewGuid().ToString('N')
$c21Log = Join-Path $c21Root ('node_modules/.cache/debt007-c21-' + $Kind + '-' + $c21Nonce + '.log')
$c21Receipt = Join-Path $c21Root ('tools/agent-helpers/debt007-c21-' + $Kind + '-' + $c21Nonce + '.local.json')
$c21Start = [DateTime]::UtcNow.ToString('o')
$c21Head = (& git rev-parse HEAD).Trim()
$c21Code = 1
try {
    Write-Host "C2.1 $Kind log: $c21Log"
    if ($Kind -eq 'storage') {
        & pnpm --filter @dss/api db:generate *> $c21Log
        if ($LASTEXITCODE -ne 0) { throw 'Prisma client generation failed; see retained log.' }
        & pnpm --filter @dss/api exec jest --config test/jest-e2e.json --runInBand --runTestsByPath test/gamification-consumption-storage.e2e-spec.ts *>> $c21Log
    } else {
        & pnpm --filter @dss/api exec jest --runInBand --runTestsByPath src/composition/gamification-delivery/infrastructure/admission-seal.codec.spec.ts *> $c21Log
    }
    $c21Code = $LASTEXITCODE
} finally {
    [ordered]@{ head=$c21Head; kind=$Kind; startedAt=$c21Start; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$c21Code; log=$c21Log; node='24.18.0'; trackedDiff=(& git diff --stat | Out-String).Trim() } |
        ConvertTo-Json | Set-Content -LiteralPath $c21Receipt
}
exit $c21Code
