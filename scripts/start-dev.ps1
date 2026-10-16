# D'aMigo's — start Postgres/Redis, migrate/seed, APIs + both frontends
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "== D'aMigo's local dev ==" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example — set JWT_SECRET if needed."
}

$guestEnv = "apps\guest\frontend\.env.local"
$crmEnv = "apps\crm\frontend\.env.local"
if (-not (Test-Path $guestEnv)) {
  Copy-Item "apps\guest\frontend\.env.local.example" $guestEnv
  Write-Host "Created $guestEnv"
}
if (-not (Test-Path $crmEnv)) {
  Copy-Item "apps\crm\frontend\.env.local.example" $crmEnv
  Write-Host "Created $crmEnv"
}

function Test-PortListening($port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

foreach ($p in @(3000, 3001, 4000, 4001)) {
  if (Test-PortListening $p) {
    Write-Warning "Port $p already in use. Stop old dev servers or you may hit the wrong app."
  }
}

Write-Host "Starting Docker (Postgres + Redis)..." -ForegroundColor Yellow
docker compose up -d

Write-Host "Installing deps (if needed)..." -ForegroundColor Yellow
npm install

Write-Host "Redis ping..." -ForegroundColor Yellow
npm run redis:ping

Write-Host "Database migrate + seed..." -ForegroundColor Yellow
npm run db:migrate
npm run db:seed

Write-Host ""
Write-Host "Starting APIs (4000 guest, 4001 crm) + web (3000 guest, 3001 crm)..." -ForegroundColor Green
Write-Host "  Guest: http://localhost:3000  |  CRM: http://localhost:3001/start"
Write-Host "  Guest API: http://localhost:4000/health  |  CRM API: http://localhost:4001/health"
Write-Host "  Owner OTP: 9876543210 / 000000  |  Guest: see .env DEV_GUEST_* phones"
Write-Host "Press Ctrl+C to stop all." -ForegroundColor DarkGray
Write-Host ""

npm run dev
