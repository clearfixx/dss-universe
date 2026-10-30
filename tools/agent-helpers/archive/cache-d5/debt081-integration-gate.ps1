# DSS Universe — ignored integration verification launcher.
# Purpose: retain exact-head full-gate evidence; disposable services only, no reset.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\admin\.codex\worktrees\d5-file-responsibilities\dss-universe'
$d81IntegrationHead = git rev-parse HEAD
if ($d81IntegrationHead -ne '29b0803f2b0ce54baf5708a50b98aee3ccf1a882') { throw 'Unexpected integration head' }
$env:DATABASE_URL = 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test'
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '6380'
$env:TEST_REDIS_PORT = '6380'
$d81IntegrationStart = [DateTime]::UtcNow.ToString('o')
$d81IntegrationExit = 1
try {
  & pnpm quality:full *> 'C:\Users\admin\AppData\Local\Temp\dss-debt081-quality-29b0803-v2.log'
  $d81IntegrationExit = $LASTEXITCODE
} catch {
  $_ | Format-List * -Force | Out-String | Add-Content -LiteralPath 'C:\Users\admin\AppData\Local\Temp\dss-debt081-quality-29b0803-v2.log'
} finally {
  [ordered]@{ head=$d81IntegrationHead; startedAt=$d81IntegrationStart; endedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$d81IntegrationExit } | ConvertTo-Json | Set-Content -LiteralPath 'node_modules/.cache/debt081-quality-29b0803-v2-result.json'
}
exit $d81IntegrationExit
