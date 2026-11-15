# DSS Universe — ignored design characterization launcher.
# Exact source; serialize after active gate, target only disposable DB5434.
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe'
$d7Head = git rev-parse HEAD
if ($d7Head -ne '8facfb0fa291d195bc252d9406e96d3e611eb424') { throw 'Unexpected source' }
$d7Start = [DateTime]::UtcNow.ToString('o')
$d7Exit = 1
try {
  while ($d7Previous = Get-CimInstance Win32_Process -Filter 'ProcessId = 18944') {
    if ($d7Previous.CommandLine -notlike '*debt013-full-gate.ps1*') { throw 'Prerequisite PID reused' }
    Start-Sleep -Seconds 10
  }
  $d7Report = Get-Content 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe\node_modules\.cache\debt013-quality-062dd36-result.json' -Raw | ConvertFrom-Json
  if ($d7Report.head -ne '062dd36c1a25e7e21a2359e996814a24a60f5669') { throw 'Prerequisite report mismatch' }
  if ((git rev-parse HEAD) -ne $d7Head -or (git status --porcelain)) { throw 'Source changed' }
  $env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
  $env:REDIS_HOST = '127.0.0.1'
  $env:REDIS_PORT = '6380'
  & pnpm --filter '@dss/api^...' build *> 'C:\Users\admin\AppData\Local\Temp\dss-debt007-db-characterization.log'
  if ($LASTEXITCODE -ne 0) { throw 'Dependency build failed' }
  & pnpm --filter @dss/api exec jest --config ./test/jest-e2e.json --runInBand --runTestsByPath test/gamification-delivery-characterization.e2e-spec.ts --json --outputFile=../../node_modules/.cache/debt007-db-characterization.json *>> 'C:\Users\admin\AppData\Local\Temp\dss-debt007-db-characterization.log'
  $d7Exit = $LASTEXITCODE
} catch {
  $_ | Out-String | Add-Content 'C:\Users\admin\AppData\Local\Temp\dss-debt007-db-characterization.log'
} finally {
  [ordered]@{head=$d7Head;startedAt=$d7Start;endedAt=[DateTime]::UtcNow.ToString('o');exitCode=$d7Exit} | ConvertTo-Json | Set-Content 'node_modules/.cache/debt007-db-characterization-result.json'
}
exit $d7Exit
