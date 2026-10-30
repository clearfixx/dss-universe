#requires -Version 7.0
<#
DSS Universe — DEBT-037 verification helper
Purpose: retain exact-source full-quality evidence against prepared test services.
Architecture: local orchestration only; reads disposable credentials from compose.
Important: no database reset, provisioning, host ACL changes or secret logging.
Build. Share. Grow.
#>
param([Parameter(Mandatory)][string]$ExpectedHead)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, '..', '..', '..'))
Set-Location -LiteralPath $root
$head = (& git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $head -cne $ExpectedHead) { throw 'Unexpected source HEAD.' }
$compose = Get-Content -LiteralPath docker-compose.test.yml -Raw
$password = [regex]::Match($compose, '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $password.Success) { throw 'Cannot resolve disposable compose password safely.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($password.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:DSS_WEB_TEST_PORT = '3195'
$cache = [IO.Path]::Combine($root, 'node_modules', '.cache')
[IO.Directory]::CreateDirectory($cache) | Out-Null
$nonce = [Guid]::NewGuid().ToString('N')
$log = [IO.Path]::Combine($cache, 'identity-quality-' + $nonce + '.log')
$receipt = [IO.Path]::Combine($root, 'tools', 'agent-helpers', 'debt037-identity-quality.local.json')
$started = [DateTime]::UtcNow.ToString('o')
$code = 1
try {
    Write-Host "Full gate log: $log"
    & pnpm quality:full *> $log
    $code = $LASTEXITCODE
} finally {
    [ordered]@{
        startedHead = $head; endedHead = (& git rev-parse HEAD).Trim()
        startedAt = $started; endedAt = [DateTime]::UtcNow.ToString('o')
        exitCode = $code; log = $log
    } | ConvertTo-Json | Set-Content -LiteralPath $receipt
}
exit $code
