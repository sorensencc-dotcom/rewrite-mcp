#!/usr/bin/env pwsh
# launch-cic.ps1
# One-click launcher script for CIC Control Plane (Windows)

# Navigate to the workspace root
cd c:\dev

# Set environment variables
$env:CP_GOOGLE_CLIENT_ID = "801446490180-h3oaobgjrf4pp57er7ho5ug1om9qfcp9.apps.googleusercontent.com"
$env:CP_ALLOWED_EMAILS = "sorensencc@gmail.com"
$env:CP_TELEMETRY_URL = "http://localhost:4310"
$env:CP_REGION = "us-east"
$env:CP_AUTH_DISABLED = "true"
$env:NODE_PATH = "node_modules"

Write-Host "✦ Launching CIC Control Plane & Telemetry..." -ForegroundColor Cyan

# Start the Telemetry Server in background
Write-Host "  → Starting Telemetry Server..."
$telemetryJob = Start-Process -FilePath "npm" -ArgumentList "start" `
  -WorkingDirectory "c:\dev\rewrite-mcp\tools\prompt-telemetry" `
  -NoNewWindow -PassThru

# Start the Control Plane in background
Write-Host "  → Starting Control Plane..."
$cpJob = Start-Process -FilePath "npm" -ArgumentList "start" `
  -WorkingDirectory "c:\dev\rewrite-mcp\apps\control-plane" `
  -NoNewWindow -PassThru

# Wait for servers to boot
Write-Host "  → Waiting for servers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Open the dashboard in the default browser
Write-Host "✦ Opening Dashboard: http://localhost:3000/dashboard" -ForegroundColor Green
Start-Process "http://localhost:3000/dashboard"

Write-Host ""
Write-Host "Control Plane running (PID: $($cpJob.Id))" -ForegroundColor Green
Write-Host "Telemetry Server running (PID: $($telemetryJob.Id))" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C in each terminal to stop servers, or use:" -ForegroundColor Gray
Write-Host "  Stop-Process -Id $($cpJob.Id)    # Stop Control Plane" -ForegroundColor Gray
Write-Host "  Stop-Process -Id $($telemetryJob.Id)    # Stop Telemetry" -ForegroundColor Gray
