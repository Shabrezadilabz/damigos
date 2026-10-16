$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sql = Join-Path $PSScriptRoot "cleanup-e2e-menu.sql"
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim().Trim('"')
      [Environment]::SetEnvironmentVariable($k, $v, "Process")
    }
  }
}
$url = $env:DATABASE_URL
if (-not $url) {
  Write-Error "DATABASE_URL not set in damigos_main/.env"
}
Write-Host "Running cleanup-e2e-menu.sql ..."
& psql $url -f $sql
Write-Host "Done."
