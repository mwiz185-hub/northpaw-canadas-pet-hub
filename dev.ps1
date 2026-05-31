# NorthPaw dev server launcher
# Checks port 8080 is free (Google OAuth requires exactly this port), then starts Vite.

$port = 8080
$inUse = netstat -ano | Select-String ":$port\s" | Select-Object -First 1

if ($inUse) {
    $pid = ($inUse -split '\s+')[-1]
    Write-Host "Port $port is in use by PID $pid." -ForegroundColor Yellow
    $answer = Read-Host "Kill it and start the dev server? (y/n)"
    if ($answer -eq 'y') {
        taskkill /PID $pid /F | Out-Null
        Write-Host "Killed PID $pid." -ForegroundColor Green
    } else {
        Write-Host "Aborted. Free port $port manually then run: npm run dev" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting NorthPaw on http://localhost:$port ..." -ForegroundColor Cyan
npm run dev
