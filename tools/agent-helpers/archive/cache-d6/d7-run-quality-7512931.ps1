<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: D7 local verification
📄 File: node_modules/.cache/d7-run-quality-7512931.ps1
🎯 Purpose:
Run one exact-head full gate with durable terminal evidence.
🧠 Responsibilities:
• use prepared disposable DB5434 and Redis6380 only;
• retain source head, timestamps, output and terminal status;
• never retry, reset databases or reconfigure services.
🏗️ Architecture:
Ignored local verification launcher, not application code.
⚠️ Important:
A successful runner does not waive its known coverage omission DEBT-082.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe'
$d7GateHead = git rev-parse HEAD
if ($d7GateHead -ne '7512931f12f6835ed2209be7a77286f3c37712d0') {
  throw 'D7 source head changed before the full gate.'
}
$env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$d7GateStarted = [DateTime]::UtcNow.ToString('o')
$d7GateCode = 1
try {
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-d7-quality-7512931.log'
  $d7GateCode = $LASTEXITCODE
} catch {
  $_ | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-d7-quality-7512931.log'
} finally {
  [ordered]@{
    head = $d7GateHead
    startedAt = $d7GateStarted
    endedAt = [DateTime]::UtcNow.ToString('o')
    exitCode = $d7GateCode
  } | ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/d7-quality-7512931-result.json'
}
exit $d7GateCode
