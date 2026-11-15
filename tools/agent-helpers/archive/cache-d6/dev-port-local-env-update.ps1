# DSS File Passport: targeted local dev endpoints; preserves all unrelated env text.
$ErrorActionPreference = 'Stop'
$taskRoot = [System.IO.Path]::GetFullPath('F:\Code\dss-universe')
$taskSpecs = @(
  @{ file='apps\web\.env'; values=[ordered]@{ NEXT_PUBLIC_SITE_URL='http://localhost:3200'; NEXT_PUBLIC_API_URL='http://localhost:3201/api'; NEXT_PUBLIC_GRAPHQL_URL='http://localhost:3201/api/graphql' } },
  @{ file='apps\web\.env.dev-port'; values=[ordered]@{ PORT='3200' } },
  @{ file='apps\api\.env'; values=[ordered]@{ PORT='3201'; WEB_ORIGINS='http://localhost:3200'; PASSWORD_RESET_WEB_URL='http://localhost:3200/reset-password'; EMAIL_VERIFICATION_WEB_URL='http://localhost:3200/verify-email' } },
  @{ file='apps\worker\.env'; values=[ordered]@{ PASSWORD_RESET_WEB_URL='http://localhost:3200/reset-password'; EMAIL_VERIFICATION_WEB_URL='http://localhost:3200/verify-email' } }
)
$taskPlans = @()
foreach ($taskSpec in $taskSpecs) {
  $taskPath = [System.IO.Path]::GetFullPath((Join-Path $taskRoot $taskSpec.file))
  if (-not $taskPath.StartsWith($taskRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Env path escapes project' }
  $taskExists = Test-Path -LiteralPath $taskPath
  if (-not $taskExists -and $taskSpec.file -ne 'apps\web\.env.dev-port') { throw 'Expected existing app env' }
  $taskBefore = if ($taskExists) { [System.IO.File]::ReadAllText($taskPath) } else { '' }
  $taskBytes = if ($taskExists) { [System.IO.File]::ReadAllBytes($taskPath) } else { [byte[]]@() }
  if ($taskBytes.Length -ge 2 -and (($taskBytes[0] -eq 255 -and $taskBytes[1] -eq 254) -or ($taskBytes[0] -eq 254 -and $taskBytes[1] -eq 255))) { throw 'Unexpected env encoding; no writes' }
  $taskBom = $taskBytes.Length -ge 3 -and $taskBytes[0] -eq 239 -and $taskBytes[1] -eq 187 -and $taskBytes[2] -eq 191
  $taskNewline = if ($taskBefore.Contains([string]::Concat([char]13,[char]10))) { [string]::Concat([char]13,[char]10) } else { [string][char]10 }
  $taskAfter = $taskBefore
  foreach ($taskKey in $taskSpec.values.Keys) {
    $taskPattern = '(?m)^' + [regex]::Escape($taskKey) + '=[^\r\n]*'
    $taskMatches = [regex]::Matches($taskAfter,$taskPattern)
    if ($taskMatches.Count -gt 1) { throw 'Duplicate endpoint key; no writes' }
    $taskLine = $taskKey + '=' + $taskSpec.values[$taskKey]
    if ($taskMatches.Count -eq 1) { $taskAfter = [regex]::Replace($taskAfter,$taskPattern,$taskLine) }
    else { if ($taskAfter.Length -gt 0 -and -not $taskAfter.EndsWith([string][char]10)) { $taskAfter += $taskNewline }; $taskAfter += $taskLine + $taskNewline }
  }
  $taskKeyPattern = '(?m)^(?:' + (($taskSpec.values.Keys | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')=[^\r\n]*(?:\r?\n|$)'
  $taskBeforeOther = [regex]::Replace($taskBefore,$taskKeyPattern,'').TrimEnd([char[]]@(13,10))
  $taskAfterOther = [regex]::Replace($taskAfter,$taskKeyPattern,'').TrimEnd([char[]]@(13,10))
  if ($taskBeforeOther -cne $taskAfterOther) { throw 'Unrelated env content would change' }
  $taskPlans += @{ path=$taskPath; before=$taskBefore; after=$taskAfter; bom=$taskBom; existed=$taskExists; keys=@($taskSpec.values.Keys) }
}
foreach ($taskPlan in $taskPlans) {
  if ($taskPlan.existed -and [System.IO.File]::ReadAllText($taskPlan.path) -cne $taskPlan.before) { throw 'Env changed concurrently; stop' }
  [System.IO.File]::WriteAllText($taskPlan.path,$taskPlan.after,[System.Text.UTF8Encoding]::new($taskPlan.bom))
  [pscustomobject]@{file=$taskPlan.path;changedKeys=$taskPlan.keys;unrelatedContentPreserved=$true}
}
