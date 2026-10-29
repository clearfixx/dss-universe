<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: DEBT-040 local verification
📄 File: node_modules/.cache/debt040-run-quality.ps1
🎯 Purpose:
Run one full gate with durable terminal evidence independent of tool sessions.
🧠 Responsibilities:
• use prepared disposable DB5434 and Redis6380 only;
• preserve the exact source head, output and exit status;
• never retry, reset data or change services.
🏗️ Architecture:
Ignored local verification launcher, not application code.
⚠️ Important:
An absent terminal report never proves completion.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe'
$env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$gate040Head = git rev-parse HEAD
$gate040Started = [DateTime]::UtcNow.ToString('o')
$gate040Code = 1
try {
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt040-quality-current.log'
  $gate040Code = $LASTEXITCODE
} catch {
  $_ | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-debt040-quality-current.log'
} finally {
  [ordered]@{ head=$gate040Head; startedAt=$gate040Started;
    endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$gate040Code } |
    ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/debt040-quality-current-result.json'
}
exit $gate040Code
