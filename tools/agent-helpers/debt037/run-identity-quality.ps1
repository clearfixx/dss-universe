#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: Storage Identity Verification
📄 File: tools/agent-helpers/debt037/run-identity-quality.ps1

🎯 Purpose:
Retains exact-source full-quality evidence against prepared test services.

🧠 Responsibilities:
• checks source identity and an explicitly supplied build interpreter;
• reads disposable credentials from compose without logging them;
• preserves each gate log and result without overwriting previous runs.

🏗️ Architecture:
Local test orchestration; never loaded by API or Worker.

⚠️ Important:
No database reset, provisioning, host ACL changes or secret logging.

🚀 Build. Share. Grow.
===============================================================
#>
param(
    [Parameter(Mandatory)][string]$ExpectedHead,
    [Parameter(Mandatory)][string]$PythonPath,
    [ValidateRange(1024, 65535)][int]$WebPort = 4200
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, '..', '..', '..'))
Set-Location -LiteralPath $root
$head = (& git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $head -cne $ExpectedHead) { throw 'Unexpected source HEAD.' }
if (-not [IO.Path]::IsPathFullyQualified($PythonPath) -or -not [IO.File]::Exists($PythonPath)) {
    throw 'An existing explicit native-build Python executable is required.'
}
$env:PYTHON = $PythonPath
$compose = Get-Content -LiteralPath docker-compose.test.yml -Raw
$password = [regex]::Match($compose, '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $password.Success) { throw 'Cannot resolve disposable compose password safely.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($password.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:DSS_WEB_TEST_PORT = [string]$WebPort
$cache = [IO.Path]::Combine($root, 'node_modules', '.cache')
[IO.Directory]::CreateDirectory($cache) | Out-Null
$nonce = [Guid]::NewGuid().ToString('N')
$log = [IO.Path]::Combine($cache, 'identity-quality-' + $nonce + '.log')
$receipt = [IO.Path]::Combine($root, 'tools', 'agent-helpers', 'debt037-identity-quality-' + $nonce + '.local.json')
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
