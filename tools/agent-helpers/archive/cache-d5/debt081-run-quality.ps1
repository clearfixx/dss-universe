<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: DEBT-081 full verification
📄 File: node_modules/.cache/debt081-run-quality.ps1
🎯 Purpose:
Run one full quality gate on the isolated demo lifecycle candidate.
🧠 Responsibilities:
• retain exact source head, timestamps, output and terminal exit status;
• use prepared disposable DB5434/Redis6380 without reset or provisioning;
• never retry failed tests or reconfigure unrelated services.
🏗️ Architecture:
Ignored local verification launcher, not runtime code.
⚠️ Important:
The separate unmerged DEBT-082 coverage omission is not waived.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe'
$d81GateHead = git rev-parse HEAD
if ($d81GateHead -ne 'e44d8775d8ba08205de98b4798148062445817bf') {
  throw 'Demo lifecycle source head changed before the full gate.'
}
$env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$d81GateStarted = [DateTime]::UtcNow.ToString('o')
$d81GateCode = 1
try {
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt081-quality-e44d877.log'
  $d81GateCode = $LASTEXITCODE
} catch {
  $_ | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-debt081-quality-e44d877.log'
} finally {
  [ordered]@{
    head = $d81GateHead
    startedAt = $d81GateStarted
    endedAt = [DateTime]::UtcNow.ToString('o')
    exitCode = $d81GateCode
  } | ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/debt081-quality-e44d877-result.json'
}
exit $d81GateCode
