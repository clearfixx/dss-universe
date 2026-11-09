#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Local C2.1 Migration Preparation
📄 File: tools/agent-helpers/gamification/generate-c21-migration.ps1
🎯 Purpose: Generates a reviewable additive diff from disposable PostgreSQL.
🧠 Responsibilities: Keeps credentials private and refuses overwriting edited SQL.
🏗️ Architecture: Read-only datasource inspection; generated DDL is never executed.
⚠️ Important: Guards and migrated regressions must be added before deployment.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
$c21Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $c21Root
$c21Directory = Join-Path $c21Root 'apps/api/prisma/migrations/20261109100000_gamification_consumption_persistence'
$c21Output = Join-Path $c21Directory 'migration.sql'
if (Test-Path -LiteralPath $c21Output) { throw 'Refusing to overwrite existing migration SQL.' }
$c21Credential = [regex]::Match((Get-Content docker-compose.test.yml -Raw), '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $c21Credential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($c21Credential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
[IO.Directory]::CreateDirectory($c21Directory) | Out-Null
& pnpm --filter @dss/api exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output $c21Output
if ($LASTEXITCODE -ne 0) { throw 'Read-only migration diff failed.' }
$c21Sql = Get-Content -LiteralPath $c21Output -Raw
$c21Expected = @('gamification_admissions','gamification_consumption_receipts','gamification_consumption_attempts','gamification_owner_progress','gamification_admission_rejections')
$c21Created = @([regex]::Matches($c21Sql, 'CREATE TABLE "([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
if ($c21Created.Count -ne 5 -or @($c21Created | Where-Object { $_ -notin $c21Expected }).Count -ne 0) { throw 'Unexpected table inventory in generated diff; inspect retained SQL.' }
if ($c21Sql -match '(?im)^\s*(DROP|TRUNCATE|DELETE|UPDATE)\b|\bALTER\s+COLUMN\b') { throw 'Unexpected destructive SQL; inspect retained diff.' }
Write-Host 'Generated five additive tables for review; no DDL was applied.'
