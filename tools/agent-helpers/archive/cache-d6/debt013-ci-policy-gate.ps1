# DSS Universe — ignored DEBT-013 full verification launcher.
# Exact source, retained terminal evidence, disposable DB only; serialized after066.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe'
$d13Head = git rev-parse HEAD
if ($d13Head -ne 'a881a1e' -and $d13Head -notlike 'a881a1e*') { throw 'Unexpected head' }
$d13Started = [DateTime]::UtcNow.ToString('o')
$d13Exit = 1
$d13Phase = 'waiting-for-debt066'
try {
  while ($d13Previous = Get-CimInstance Win32_Process -Filter 'ProcessId = 19936') {
    if ($d13Previous.CommandLine -notlike '*debt066-main81-gate.ps1*') { throw 'Prerequisite PID reused' }
    Start-Sleep -Seconds 10
  }
  $d13PreviousReport = Get-Content 'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe\node_modules\.cache\debt066-quality-b770e45-result.json' -Raw | ConvertFrom-Json
  if ($d13PreviousReport.head -ne 'b770e45bb69e1994b96f3c060a6da39b9df1d3e9') { throw 'Prerequisite report mismatch' }
  if ((git rev-parse HEAD) -ne $d13Head -or (git status --porcelain)) { throw 'Source changed while waiting' }
  $env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
  $env:REDIS_HOST = '127.0.0.1'
  $env:REDIS_PORT = '6380'
  $env:TEST_REDIS_PORT = '6380'
  $d13Phase = 'running-quality'
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt013-quality-a881a1e.log'
  $d13Exit = $LASTEXITCODE
} catch {
  $_ | Format-List * -Force | Out-String | Add-Content 'C:\Users\admin\AppData\Local\Temp\dss-debt013-quality-a881a1e.log'
} finally {
  [ordered]@{head=$d13Head;startedAt=$d13Started;endedAt=[DateTime]::UtcNow.ToString('o');exitCode=$d13Exit;lastPhase=$d13Phase} | ConvertTo-Json | Set-Content 'node_modules/.cache/debt013-quality-a881a1e-result.json'
}
exit $d13Exit
