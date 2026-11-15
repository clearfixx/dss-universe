<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: DEBT-083 local verification infrastructure
📄 File: node_modules/.cache/debt083-run-quality.ps1
🎯 Purpose:
Keep one full-gate attempt and its terminal evidence independent of tool handles.
🧠 Responsibilities:
• use only approved disposable endpoints;
• retain output and actual terminal exit status;
• never retry or suppress a failed gate.
🏗️ Architecture:
Ignored local launcher, not application or committed CI code.
⚠️ Important:
Missing result file never proves success. No reset or service provisioning.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe'
$env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$quality083Head = git rev-parse HEAD
$quality083Started = [DateTime]::UtcNow.ToString('o')
$quality083Code = 1
try {
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt083-quality-durable.log'
  $quality083Code = $LASTEXITCODE
} catch {
  $_ | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-debt083-quality-durable.log'
} finally {
  [ordered]@{ head = $quality083Head; startedAt = $quality083Started;
    endedAt = [DateTime]::UtcNow.ToString('o'); exitCode = $quality083Code } |
    ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/debt083-quality-durable-result.json'
}
exit $quality083Code
