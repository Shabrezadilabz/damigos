# Quick health check for local D'aMigo's APIs
$ErrorActionPreference = "Continue"
$checks = @(
  @{ name = "guest-api"; url = "http://127.0.0.1:4000/health" },
  @{ name = "crm-api"; url = "http://127.0.0.1:4001/health" }
)
$ok = $true
foreach ($c in $checks) {
  try {
    $r = Invoke-RestMethod -Uri $c.url -TimeoutSec 3
    Write-Host "[OK] $($c.name) $($c.url)" -ForegroundColor Green
    if ($c.name -eq "crm-api" -and $r.dependencies.redis) {
      Write-Host "     redis: $($r.dependencies.redis)"
    }
  } catch {
    Write-Host "[FAIL] $($c.name) $($c.url) — $($_.Exception.Message)" -ForegroundColor Red
    $ok = $false
  }
}
if (-not $ok) {
  Write-Host ""
  Write-Host "Fix: cd damigos_main; .\scripts\stop-damigos-ports.ps1; npm install; npm run dev:api"
  exit 1
}
