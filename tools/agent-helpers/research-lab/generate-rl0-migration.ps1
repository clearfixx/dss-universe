#requires -Version 7.0
<#
===============================================================
🚀 DSS Universe
📦 Module: Research Lab RL-0 Migration Preparation
📄 File: tools/agent-helpers/research-lab/generate-rl0-migration.ps1
🎯 Purpose: Generates a reviewable additive Research Lab diff from disposable PostgreSQL.
🧠 Responsibilities: Guards the target, inventory and non-destructive DDL.
🏗️ Architecture: Read-only datasource inspection; generated DDL is not executed here.
⚠️ Important: The disposable database must contain every accepted main migration.
🚀 Build. Share. Grow.
===============================================================
#>
$ErrorActionPreference = 'Stop'
$rl0Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $rl0Root
$rl0Directory = Join-Path $rl0Root 'apps/api/prisma/migrations/20261118170000_add_research_lab_foundation'
$rl0Output = Join-Path $rl0Directory 'migration.sql'
if (Test-Path -LiteralPath $rl0Output) { throw 'Refusing to overwrite existing migration SQL.' }
$rl0Credential = [regex]::Match((Get-Content docker-compose.test.yml -Raw), '(?m)^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$')
if (-not $rl0Credential.Success) { throw 'Disposable credential unavailable.' }
$env:DATABASE_URL = 'postgresql://dss_test:' + [Uri]::EscapeDataString($rl0Credential.Groups[1].Value) + '@127.0.0.1:5434/dss_test'
& pnpm --filter @dss/api exec prisma migrate status
if ($LASTEXITCODE -ne 0) { throw 'Disposable database is not at the accepted migration baseline.' }
[IO.Directory]::CreateDirectory($rl0Directory) | Out-Null
& pnpm --filter @dss/api exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output $rl0Output
if ($LASTEXITCODE -ne 0) { throw 'Read-only Research Lab migration diff failed.' }
$rl0Sql = Get-Content -LiteralPath $rl0Output -Raw
$rl0Expected = @(
  'research_pages', 'research_drafts', 'research_revisions',
  'research_review_decisions', 'research_page_audience_groups',
  'research_categories', 'research_page_categories', 'research_tags',
  'research_page_tags', 'research_technologies',
  'research_page_technologies', 'research_manuals',
  'research_manual_chapters', 'research_collections',
  'research_collection_items', 'research_slug_aliases',
  'research_internal_links'
)
$rl0Created = @([regex]::Matches($rl0Sql, 'CREATE TABLE "([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
if ($rl0Created.Count -ne $rl0Expected.Count -or @($rl0Created | Where-Object { $_ -notin $rl0Expected }).Count -ne 0) {
  throw 'Unexpected Research Lab table inventory in generated diff; inspect retained SQL.'
}
if ($rl0Sql -match '(?im)^\s*(DROP|TRUNCATE|DELETE|UPDATE)\b|\bALTER\s+COLUMN\b') {
  throw 'Unexpected destructive SQL; inspect retained diff.'
}
Write-Host 'Generated seventeen additive Research Lab tables for review; no DDL was applied.'
