# Fixes CRM GET /v1/menu/items 500 when DB is behind Drizzle schema
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$sql = Get-Content -Raw -Path "$PSScriptRoot\patch-menu-reference-price.sql"
docker compose exec -T postgres psql -U damigos -d damigos -v ON_ERROR_STOP=1 -c $sql
Write-Host "Menu schema patch applied."
