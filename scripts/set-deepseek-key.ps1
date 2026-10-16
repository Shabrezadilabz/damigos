# Sets DEEPSEEK_API_KEY in damigos_main/.env (gitignored). Usage:
#   .\scripts\set-deepseek-key.ps1 -Key "sk-..."
param(
  [Parameter(Mandatory = $true)]
  [string]$Key
)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  Write-Error ".env not found at $envFile — copy from .env.example first."
  exit 1
}

$content = Get-Content $envFile -Raw
if ($content -match "(?m)^DEEPSEEK_API_KEY=.*$") {
  $content = $content -replace "(?m)^DEEPSEEK_API_KEY=.*$", "DEEPSEEK_API_KEY=$Key"
} else {
  $content = $content.TrimEnd() + "`nDEEPSEEK_API_KEY=$Key`n"
}
Set-Content -Path $envFile -Value $content -NoNewline
Write-Host "Updated DEEPSEEK_API_KEY in .env (restart CRM API on port 4001)."
