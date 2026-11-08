# DSS Universe — DEBT-066 integration gate, serialized after DEBT-057.
# Ignored verification launcher: exact heads, disposable services, retained evidence.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe'
$d66Head = git rev-parse HEAD
if ($d66Head -ne 'b770e45bb69e1994b96f3c060a6da39b9df1d3e9') { throw 'Unexpected source head' }
$d66Started = [DateTime]::UtcNow.ToString('o')
$d66Exit = 1
$d66Phase = 'waiting-for-debt057'
try {
  while ($d66Previous = Get-CimInstance Win32_Process -Filter 'ProcessId = 23024') {
    if ($d66Previous.CommandLine -notlike '*debt057-integration-gate.ps1*') { throw 'Prerequisite PID reused' }
    Start-Sleep -Seconds 10
  }
  $d66PreviousReport = Get-Content -LiteralPath 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe\node_modules\.cache\debt057-quality-a554f41-result.json' -Raw | ConvertFrom-Json
  if ($d66PreviousReport.head -ne 'a554f41b9cf372fc105a4f2a22c1bafcbcb89db4') { throw 'Prerequisite report mismatch' }
  if ((git rev-parse HEAD) -ne $d66Head -or (git status --porcelain)) { throw 'Source changed while waiting' }
  $env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
  $env:REDIS_HOST = '127.0.0.1'
  $env:REDIS_PORT = '6380'
  $env:TEST_REDIS_PORT = '6380'
  $d66Phase = 'running-quality'
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt066-quality-b770e45.log'
  $d66Exit = $LASTEXITCODE
} catch {
  $_ | Format-List * -Force | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-debt066-quality-b770e45.log'
} finally {
  [ordered]@{head=$d66Head; startedAt=$d66Started; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$d66Exit; lastPhase=$d66Phase} | ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/debt066-quality-b770e45-result.json'
}
exit $d66Exit
