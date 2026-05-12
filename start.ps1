# Start Institutional Intelligence Terminal

Write-Host "🚀 Starting Institutional Intelligence Terminal..." -ForegroundColor Cyan
Write-Host ""

# Create cache directory
New-Item -ItemType Directory -Force -Path "backend\cache" | Out-Null

# Get current location
$CurrentDir = Get-Location

# Start Python backend on port 8000
Write-Host "📊 Starting Python Intelligence Engine..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$CurrentDir'; `$env:PYTHONPATH = '$CurrentDir'; python backend/main.py"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend (Vite defaults to 5173 usually, but we'll let it handle it)
Write-Host "🎨 Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$CurrentDir'; npm run dev"

Write-Host ""
Write-Host "✅ ALL SYSTEMS ONLINE" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:"
Write-Host "   Frontend: http://localhost:5173 (or as shown in frontend window)"
Write-Host "   Backend API: http://localhost:8000"
Write-Host ""
Write-Host "⚡ Features:"
Write-Host "   • Batch processing (minimal API usage)"
Write-Host "   • AI intelligence (free tier optimized)"
Write-Host "   • Calm, institutional UI"
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop servers"
