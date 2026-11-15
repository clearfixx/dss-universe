#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Local C2.1 Verification
📄 File: tools/agent-helpers/gamification/verify-c21-migration.ps1
🎯 Purpose: Deploys reviewed migrations only to the fixed disposable test database.
🧠 Responsibilities: Retains validation, deployment and zero-drift evidence.
🏗️ Architecture: Agent helper; pinned process-local tools, no dev target or reset.
⚠️ Important: Reads the disposable credential silently from test compose.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
$c21Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $c21Root
$c21NodeDirectory = Join-Path $c21Root 'node_modules/.cache/c21-node24'
if ((& (Join-Path $c21NodeDirectory 'node.exe') --version).Trim() -cne 'v24.18.0') { throw 'Unexpected Node runtime.' }
$env:PATH = $c21NodeDirectory + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$c21Credential = [regex]::Match((Get-Content docker-compose.test.yml -Raw), '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $c21Credential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($c21Credential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$c21Target = [Uri]$env:DATABASE_URL
if ($c21Target.Host -cne '127.0.0.1' -or $c21Target.Port -ne 5434 -or $c21Target.AbsolutePath -cne '/dss_test' -or $c21Target.Query -or $c21Target.Fragment) { throw 'Disposable target guard failed.' }
$c21Nonce = [Guid]::NewGuid().ToString('N')
$c21Log = Join-Path $c21Root ('node_modules/.cache/debt007-c21-migration-' + $c21Nonce + '.log')
$c21Receipt = Join-Path $c21Root ('tools/agent-helpers/debt007-c21-migration-' + $c21Nonce + '.local.json')
$c21Start = [DateTime]::UtcNow.ToString('o')
$c21Code = 1
try {
    Write-Host "C2.1 migration log: $c21Log"
    & pnpm --filter @dss/api db:validate *> $c21Log
    if ($LASTEXITCODE -ne 0) { throw 'Prisma validation failed; see retained log.' }
    & pnpm --filter @dss/api db:deploy *>> $c21Log
    if ($LASTEXITCODE -ne 0) { throw 'Disposable migration deployment failed; see retained log.' }
    & pnpm db:check-drift *>> $c21Log
    $c21Code = $LASTEXITCODE
} finally {
    [ordered]@{ head=(& git rev-parse HEAD).Trim(); startedAt=$c21Start; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$c21Code; log=$c21Log; target='127.0.0.1:5434/dss_test'; node='24.18.0' } |
        ConvertTo-Json | Set-Content -LiteralPath $c21Receipt
}
exit $c21Code
