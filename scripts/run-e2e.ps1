# D'aMigo's local E2E — requires Docker Postgres + free ports 3000/3001/4000/4001
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

function Test-PortListening($port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

foreach ($p in @(3000, 3001, 4000, 4001)) {
  if (Test-PortListening $p) {
    Write-Warning "Port $p is already in use. Stop other apps (especially guest :3000) or E2E may hit the wrong server."
  }
}

docker compose up -d
npm install
npm run redis:ping
npm run db:migrate
npm run db:seed

$fixtures = $null
try {
  $fixtures = Invoke-RestMethod "http://localhost:4000/v1/dev/e2e-fixtures" -ErrorAction Stop
} catch {
  Write-Host "Starting APIs (fixtures not ready yet)..."
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; npm run dev:api" | Out-Null
  $deadline = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    try {
      $fixtures = Invoke-RestMethod "http://localhost:4000/v1/dev/e2e-fixtures" -ErrorAction Stop
      break
    } catch { }
  }
}

if (-not $fixtures) {
  throw "GET /v1/dev/e2e-fixtures failed. Ensure ENABLE_DEV_FIXTURES=true in root .env and guest-api on :4000."
}

if (-not (Test-PortListening 3000) -or -not (Test-PortListening 3001)) {
  Write-Host "Starting web apps..."
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; npm run dev:web" | Out-Null
  npx --yes wait-on@7.2.0 "http-get://127.0.0.1:3000" "http-get://127.0.0.1:3001/start" -t 180000
}

Push-Location e2e
npx playwright install chromium
Pop-Location

npm run test:e2e
