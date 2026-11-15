<#
===============================================================
🚀 DSS Universe
---------------------------------------------------------------
📦 Module: DEBT-082 integration verification
📄 File: node_modules/.cache/debt082-run-quality-main80.ps1
🎯 Purpose:
Serializes one integration gate after the verified live DEBT-081 gate.
🧠 Responsibilities:
• verifies the exact dependency process and terminal report;
• runs only committed integration head8cc1e50 with disposable5434/Redis6380;
• retains durable phase/result/log evidence without retries or resets.
🏗️ Architecture:
Ignored one-shot verification orchestration, not a scheduler or application.
⚠️ Important:
A waiting phase or missing report does not prove test completion.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe'
$d82GateHead = git rev-parse HEAD
if ($d82GateHead -ne '8cc1e500790664f220bb872cbc0bd7558d226a21') {
  throw 'Coverage integration head changed before verification.'
}
$d82GateStarted = [DateTime]::UtcNow.ToString('o')
$d82GateCode = 1
$d82GatePhase = 'waiting-for-debt081'
$d82GateFailure = $null
try {
  $d82Dependency = Get-CimInstance Win32_Process -Filter 'ProcessId=31732'
  if ($d82Dependency) {
    $d82ExpectedScript = 'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe\node_modules\.cache\debt081-run-quality.ps1'
    if (-not $d82Dependency.CommandLine.Contains($d82ExpectedScript)) {
      throw 'Dependency PID no longer belongs to the expected DEBT-081 launcher.'
    }
    $d82DependencyProcess = Get-Process -Id 31732 -ErrorAction SilentlyContinue
    if ($d82DependencyProcess) { $d82DependencyProcess.WaitForExit() }
  }
  $d82DependencyReport = Get-Content -Raw -LiteralPath 'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe\node_modules\.cache\debt081-quality-e44d877-result.json' | ConvertFrom-Json
  if ($d82DependencyReport.head -ne 'e44d8775d8ba08205de98b4798148062445817bf' -or $d82DependencyReport.exitCode -ne 0) {
    throw 'Expected successful terminal DEBT-081 report before reusing the test services.'
  }
  if ((git rev-parse HEAD) -ne $d82GateHead) {
    throw 'Integration source changed while waiting.'
  }
  $d82GatePhase = 'running-quality'
  $env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
  $env:REDIS_HOST = '127.0.0.1'
  $env:REDIS_PORT = '6380'
  $env:TEST_REDIS_PORT = '6380'
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt082-quality-8cc1e50.log'
  $d82GateCode = $LASTEXITCODE
} catch {
  $d82GateFailure = $_.Exception.Message
  $_ | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-debt082-quality-8cc1e50.log'
} finally {
  [ordered]@{
    head = $d82GateHead
    startedAt = $d82GateStarted
    endedAt = [DateTime]::UtcNow.ToString('o')
    exitCode = $d82GateCode
    lastPhase = $d82GatePhase
    failure = $d82GateFailure
  } | ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/debt082-quality-8cc1e50-result.json'
}
exit $d82GateCode
