<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: DEBT-066 full verification
📄 File: node_modules/.cache/debt066-run-quality.ps1
🎯 Purpose:
Run one full quality gate on the committed Editor safety candidate.
🧠 Responsibilities:
• retain exact source head, timestamps, output and exit status;
• use prepared disposable DB5434 and Redis6380 without resets;
• never retry a failed test or change services.
🏗️ Architecture:
Ignored local verification launcher, not application code.
⚠️ Important:
The unmerged DEBT-082 coverage omission remains; shared65 tests run separately.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe'
$d66GateHead = git rev-parse HEAD
if (-not $d66GateHead.StartsWith('8a112c1')) {
  throw 'Editor safety candidate changed before the full gate.'
}
$env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$d66GateStarted = [DateTime]::UtcNow.ToString('o')
$d66GateCode = 1
try {
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt066-quality-8a112c1.log'
  $d66GateCode = $LASTEXITCODE
} catch {
  $_ | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-debt066-quality-8a112c1.log'
} finally {
  [ordered]@{
    head = $d66GateHead
    startedAt = $d66GateStarted
    endedAt = [DateTime]::UtcNow.ToString('o')
    exitCode = $d66GateCode
  } | ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/debt066-quality-8a112c1-result.json'
}
exit $d66GateCode
