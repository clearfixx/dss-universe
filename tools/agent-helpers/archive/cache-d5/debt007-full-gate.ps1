# DSS Universe — ignored design/characterization full verification launcher.
# Exact source and disposable services; serialized after DEBT-013.
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe'
$d7Head = git rev-parse HEAD
if ($d7Head -ne 'a69f9cf9c13079f4ed6389f959dd8aaa45bd23d7') { throw 'Unexpected source' }
$d7Start = [DateTime]::UtcNow.ToString('o')
$d7Exit = 1
$d7Phase = 'waiting-for-debt013'
try {
  while ($d7Previous = Get-CimInstance Win32_Process -Filter 'ProcessId = 5448') {
    if ($d7Previous.CommandLine -notlike '*debt013-ci-policy-gate.ps1*') { throw 'Prerequisite PID reused' }
    Start-Sleep -Seconds 10
  }
  $d7Prior = Get-Content 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe\node_modules\.cache\debt013-quality-a881a1e-result.json' -Raw | ConvertFrom-Json
  if ($d7Prior.head -ne 'a881a1e382fc6a2d1367cbe82fdcf825c6b4568d') { throw 'Prior report mismatch' }
  if ((git rev-parse HEAD) -ne $d7Head -or (git status --porcelain)) { throw 'Source changed' }
  $env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
  $env:REDIS_HOST = '127.0.0.1'
  $env:REDIS_PORT = '6380'
  $env:TEST_REDIS_PORT = '6380'
  $d7Phase = 'running-quality'
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt007-quality-a69f9cf.log'
  $d7Exit = $LASTEXITCODE
} catch { $_ | Out-String | Add-Content 'C:\Users\admin\AppData\Local\Temp\dss-debt007-quality-a69f9cf.log' }
finally { [ordered]@{head=$d7Head;startedAt=$d7Start;endedAt=[DateTime]::UtcNow.ToString('o');exitCode=$d7Exit;lastPhase=$d7Phase} | ConvertTo-Json | Set-Content 'node_modules/.cache/debt007-quality-a69f9cf-result.json' }
exit $d7Exit
