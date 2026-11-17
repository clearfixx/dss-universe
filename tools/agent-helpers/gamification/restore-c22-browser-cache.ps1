#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Local Browser Verification Maintenance
📄 File: tools/agent-helpers/gamification/restore-c22-browser-cache.ps1
🎯 Purpose: Retains missing-browser evidence before restoring the pinned headless shell.
🧠 Responsibilities: Uses the installed Playwright revision without dependency updates.
🏗️ Architecture: Ad hoc local helper; no service provisioning or frontend source mutation.
⚠️ Important: --no-remove preserves browsers used by other checkouts.
🚀 Build. Share. Grow.
===============================================================
#>
param([Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$ExpectedHead)
$ErrorActionPreference = 'Stop'
$browserRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $browserRoot
if ((& git rev-parse HEAD).Trim() -cne $ExpectedHead) { throw 'Unexpected source head.' }
$browserNodeDirectory = Join-Path $browserRoot 'node_modules/.cache/c21-node24'
if ((& (Join-Path $browserNodeDirectory 'node.exe') --version).Trim() -cne 'v24.22.3') { throw 'Unexpected Node runtime.' }
$env:PATH = $browserNodeDirectory + ';' + (Join-Path $PSScriptRoot 'bin') + ';' + $env:PATH
$browserNonce = [Guid]::NewGuid().ToString('N')
$browserEvidence = Join-Path $browserRoot ('tools/agent-helpers/debt007-c22-browser-missing-' + $browserNonce + '.local.zip')
$browserFailureCopy = Join-Path $browserRoot ('tools/agent-helpers/debt007-c22-browser-missing-' + $browserNonce + '.local.log')
$browserOriginalLog = Join-Path $browserRoot 'node_modules/.cache/debt007-c22-prepared-full-f65531c8ed894aa9b8204f8389db321d.log'
Compress-Archive -LiteralPath (Join-Path $browserRoot 'apps/web/test-results') -DestinationPath $browserEvidence
Copy-Item -LiteralPath $browserOriginalLog -Destination $browserFailureCopy
if ((Get-FileHash -LiteralPath $browserOriginalLog -Algorithm SHA256).Hash -cne (Get-FileHash -LiteralPath $browserFailureCopy -Algorithm SHA256).Hash) { throw 'Failure evidence copy differs.' }
$browserLog = Join-Path $browserRoot ('node_modules/.cache/debt007-c22-browser-install-' + $browserNonce + '.log')
$browserReceipt = Join-Path $browserRoot ('tools/agent-helpers/debt007-c22-browser-install-' + $browserNonce + '.local.json')
$browserCode = 1
try {
    Write-Host "Browser install log: $browserLog"
    & pnpm --filter @dss/web exec playwright install chromium --only-shell --no-remove --no-progress *> $browserLog
    $browserCode = $LASTEXITCODE
} finally {
    [ordered]@{
        head=(& git rev-parse HEAD).Trim(); exitCode=$browserCode; log=$browserLog
        retainedFailureLog=$browserFailureCopy; retainedArtifacts=$browserEvidence
        archiveSha256=(Get-FileHash -LiteralPath $browserEvidence -Algorithm SHA256).Hash
        failureLogSha256=(Get-FileHash -LiteralPath $browserFailureCopy -Algorithm SHA256).Hash
        dependencyUpdate=$false; unusedBrowserRemoval=$false
    } | ConvertTo-Json | Set-Content -LiteralPath $browserReceipt
}
exit $browserCode
