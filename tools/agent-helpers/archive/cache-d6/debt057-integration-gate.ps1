# DSS Universe — DEBT-057 isolated integration verification launcher.
# Retains exact-head evidence; prepared disposable services only, no reset.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d6-quality-baseline\dss-universe'
$d57Head = git rev-parse HEAD
if ($d57Head -ne 'a554f41b9cf372fc105a4f2a22c1bafcbcb89db4') { throw 'Unexpected source head' }
$env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$d57Started = [DateTime]::UtcNow.ToString('o')
$d57Exit = 1
try {
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt057-quality-a554f41.log'
  $d57Exit = $LASTEXITCODE
} catch {
  $_ | Format-List * -Force | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-debt057-quality-a554f41.log'
} finally {
  [ordered]@{ head=$d57Head; startedAt=$d57Started; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$d57Exit } | ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/debt057-quality-a554f41-result.json'
}
exit $d57Exit
