# Free D'aMigo's dev ports (3000/3001/4000/4001) when old node processes block APIs
$ports = @(3000, 3001, 4000, 4001)
foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $procId = $c.OwningProcess
    Write-Host "Stopping PID $procId on port $port"
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}
Write-Host "Done. Start again: npm run dev:api && npm run dev:web"
