# FinMotion AI — One-command dev startup
# Starts backend, Cloudflare tunnel, and optionally updates Vercel env var.
# Usage: .\start-dev.ps1 [-UpdateVercel]
param([switch]$UpdateVercel)

$ROOT = "C:\Users\user\Documents\AI\finmotion_-premium-financial-intelligence"
$CLOUDFLARED = "$env:TEMP\cloudflared.exe"

Write-Host "`n[FinMotion] Starting FinMotion AI dev environment..." -ForegroundColor Cyan

# ── 1. Start Backend ───────────────────────────────────────────────
Write-Host "[1/3] Starting FastAPI backend on port 8000..." -ForegroundColor Yellow
$env:PYTHONPATH = $ROOT
$backendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    $env:PYTHONPATH = $root
    & python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList $ROOT

Start-Sleep -Seconds 3
Write-Host "    Backend started (Job ID: $($backendJob.Id))" -ForegroundColor Green

# ── 2. Start Cloudflare Tunnel ────────────────────────────────────
Write-Host "[2/3] Starting Cloudflare tunnel..." -ForegroundColor Yellow

if (-not (Test-Path $CLOUDFLARED)) {
    Write-Host "    Downloading cloudflared..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CLOUDFLARED
}

# Start tunnel and capture output
$tunnelOutput = [System.Collections.Concurrent.ConcurrentQueue[string]]::new()
$tunnelJob = Start-Job -ScriptBlock {
    param($exe)
    & $exe tunnel --url http://localhost:8000 2>&1
} -ArgumentList $CLOUDFLARED

# Wait up to 15s for the tunnel URL
$tunnelUrl = $null
$deadline = (Get-Date).AddSeconds(15)
Write-Host "    Waiting for tunnel URL..." -ForegroundColor Gray

while ((Get-Date) -lt $deadline -and -not $tunnelUrl) {
    Start-Sleep -Milliseconds 500
    $output = Receive-Job $tunnelJob
    if ($output) {
        $match = $output | Select-String -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com'
        if ($match) {
            $tunnelUrl = $match.Matches[0].Value
        }
    }
}

if ($tunnelUrl) {
    Write-Host "    Tunnel URL: $tunnelUrl" -ForegroundColor Green
} else {
    Write-Host "    Could not capture tunnel URL automatically." -ForegroundColor Red
    Write-Host "    Check the cloudflared output manually." -ForegroundColor Red
}

# ── 3. Update Vercel (optional) ───────────────────────────────────
if ($UpdateVercel -and $tunnelUrl) {
    Write-Host "[3/3] Updating Vercel environment variable..." -ForegroundColor Yellow

    $vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
    if (-not $vercelInstalled) {
        Write-Host "    Vercel CLI not found. Install with: npm i -g vercel" -ForegroundColor Red
    } else {
        vercel env rm VITE_API_BASE production --yes 2>$null
        echo $tunnelUrl | vercel env add VITE_API_BASE production
        Write-Host "    Deploying to Vercel..." -ForegroundColor Gray
        vercel --prod
        Write-Host "    Vercel updated and deployed!" -ForegroundColor Green
    }
} elseif ($UpdateVercel -and -not $tunnelUrl) {
    Write-Host "[3/3] Skipping Vercel update — tunnel URL not captured." -ForegroundColor Red
    Write-Host "    Manually set VITE_API_BASE in Vercel dashboard." -ForegroundColor Gray
} else {
    Write-Host "[3/3] Vercel update skipped. Run with -UpdateVercel to auto-deploy." -ForegroundColor Gray
    if ($tunnelUrl) {
        Write-Host "    Copy this URL to Vercel > Settings > Env Vars > VITE_API_BASE:" -ForegroundColor Gray
        Write-Host "    $tunnelUrl" -ForegroundColor White
    }
}

# ── Summary ────────────────────────────────────────────────────────
Write-Host "`n[FinMotion] Dev environment ready!" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000"
Write-Host "  API docs: http://localhost:8000/docs"
if ($tunnelUrl) { Write-Host "  Tunnel:   $tunnelUrl" }
Write-Host "`nPress Ctrl+C to stop all jobs, then run: Stop-Job $($backendJob.Id), $($tunnelJob.Id)"
Write-Host ""

# Keep alive
try { Wait-Job $backendJob } catch { }
