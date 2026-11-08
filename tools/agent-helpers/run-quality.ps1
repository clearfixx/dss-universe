#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: Local Verification Orchestration
📄 File: tools/agent-helpers/run-quality.ps1

🎯 Purpose:
Retains exact-source full-gate results against prepared disposable services.

🧠 Responsibilities:
• validates the requested source and explicit native-build interpreter;
• reads test credentials from compose without logging them;
• preserves unique logs and receipts for every invocation.

🏗️ Architecture:
Agent helper only; delegates verification and service guards to quality:full.

⚠️ Important:
Never provisions services, resets databases or changes host power settings.

🚀 Build. Share. Grow.
===============================================================
#>
param(
    [Parameter(Mandatory)][string]$ExpectedHead,
    [Parameter(Mandatory)][string]$PythonPath,
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label = 'full-gate',
    [ValidateRange(1024, 65535)][int]$WebPort = 4200
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, '..', '..'))
Set-Location -LiteralPath $root
$head = (& git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $head -cne $ExpectedHead) { throw 'Unexpected source HEAD.' }
if (-not [IO.Path]::IsPathFullyQualified($PythonPath) -or -not [IO.File]::Exists($PythonPath)) {
    throw 'Explicit existing native-build interpreter required.'
}
$compose = Get-Content -LiteralPath docker-compose.test.yml -Raw
$password = [regex]::Match($compose, '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $password.Success) { throw 'Disposable compose credential missing.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($password.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$env:DSS_WEB_TEST_PORT = [string]$WebPort
$env:PYTHON = $PythonPath
$nonce = [Guid]::NewGuid().ToString('N')
$cache = [IO.Path]::Combine($root, 'node_modules', '.cache')
[IO.Directory]::CreateDirectory($cache) | Out-Null
$log = [IO.Path]::Combine($cache, $Label + '-' + $nonce + '.log')
$receipt = [IO.Path]::Combine($PSScriptRoot, $Label + '-' + $nonce + '.local.json')
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
