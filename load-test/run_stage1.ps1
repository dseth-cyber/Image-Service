#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Stage 1 Load Test Orchestrator — 10 Cameras / 24 Hours
.DESCRIPTION
    Sets up and executes the Stage 1 validation test:
    1. Seeds 10 cameras with SMB share paths
    2. Configures sync-worker for 30s poll intervals
    3. Starts TIFF writer simulating 10 cameras writing 3-6 MB files every 30s
    4. Launches monitoring collection every 30 minutes
    5. Generates final report after 24 hours
#>

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot
$LOADTEST = $PSScriptRoot
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$REPORT_DIR = "$LOADTEST\report_$TIMESTAMP"
$METRICS_DIR = "$REPORT_DIR\metrics"

Write-Host "▓" * 60 -ForegroundColor Cyan
Write-Host "  Image Service — Stage 1 Load Test" -ForegroundColor Cyan
Write-Host "  10 Cameras / 24 Hours / 3-6 MB TIFF / 30s Interval" -ForegroundColor Cyan
Write-Host "▓" * 60 -ForegroundColor Cyan

# ── Prerequisites Check ──────────────────────────────────────────
Write-Host "`n[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Check docker
try {
    $dockerVer = docker version --format "{{.Server.Version}}" 2>$null
    Write-Host "  ✓ Docker: $dockerVer" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker is not running. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check all services running
$required = @("image-postgres", "image-api", "image-redis", "image-minio", "image-smb-server", "image-sync-worker", "image-processing-worker", "image-kafka")
$running = docker ps --format "{{.Names}}" 2>$null
foreach ($svc in $required) {
    if ($running -contains $svc) {
        Write-Host "  ✓ $svc" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $svc is not running. Run 'docker compose up -d' first." -ForegroundColor Red
        exit 1
    }
}

# ── Step 2: Seed 10 Cameras ──────────────────────────────────────
Write-Host "`n[2/6] Seeding 10 cameras into database..." -ForegroundColor Yellow
docker cp "$LOADTEST\seed_10_cameras.sql" image-postgres:/tmp/seed_10_cameras.sql 2>&1
$seedResult = docker exec image-postgres psql -U image_user -d image_db -f /tmp/seed_10_cameras.sql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Cameras seeded successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Seed failed: $seedResult" -ForegroundColor Red
    exit 1
}

# Verify cameras
$camCount = docker exec image-postgres psql -U image_user -d image_db -t -A -c "SELECT COUNT(*) FROM cameras" 2>$null
Write-Host "  → Total cameras in DB: $camCount" -ForegroundColor Gray

# ── Step 3: Create camera directories in SMB share ──────────────
Write-Host "`n[3/6] Creating camera directories in SMB share..." -ForegroundColor Yellow
for ($i = 1; $i -le 10; $i++) {
    $dir = "$ROOT\mock_smb_shares\cam_$i"
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  + Created: cam_$i" -ForegroundColor Gray
    } else {
        Write-Host "  ✓ Exists: cam_$i" -ForegroundColor Green
    }
}

# Clear existing files (optional: keep for traceability)
$confirm = Read-Host "  Clear existing TIFF files in camera dirs? (y/N)"
if ($confirm -eq "y") {
    Get-ChildItem "$ROOT\mock_smb_shares\cam_*" -Filter "*.tiff" | Remove-Item -Force
    Write-Host "  ✓ Cleared existing TIFF files" -ForegroundColor Green
}

# ── Step 4: Start TIFF Writer ────────────────────────────────────
Write-Host "`n[4/6] Starting TIFF writer container..." -ForegroundColor Yellow
$writerContainer = "image-tiff-writer"

# Clean up old writer if exists
docker rm -f $writerContainer 2>$null | Out-Null

docker build -t image-tiff-writer -f "$LOADTEST\Dockerfile.tiff-writer" "$LOADTEST" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to build TIFF writer image" -ForegroundColor Red
    exit 1
}

docker run -d `
    --name $writerContainer `
    -v "$($ROOT):/share" `
    -e WRITE_INTERVAL=30 `
    -e CAMERA_COUNT=10 `
    -e OUTPUT_BASE=/share/mock_smb_shares `
    -e MIN_SIZE_MB=3 `
    -e MAX_SIZE_MB=6 `
    --network image-network `
    image-tiff-writer 2>&1

if ($LASTEXECODE -eq 0) {
    Write-Host "  ✓ TIFF writer started (container: $writerContainer)" -ForegroundColor Green
    # Wait for first files to be written
    Write-Host "  → Waiting 35s for initial TIFF files..." -ForegroundColor Gray
    Start-Sleep -Seconds 35
} else {
    Write-Host "  ✗ Failed to start TIFF writer" -ForegroundColor Red
    exit 1
}

# ── Step 5: Verify data flow ─────────────────────────────────────
Write-Host "`n[5/6] Verifying data flow..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check API stats
try {
    $stats = docker exec image-api wget -qO- http://localhost:3001/image-service/api/processing-logs/stats 2>$null
    if ($stats) {
        $statsObj = $stats | ConvertFrom-Json
        Write-Host "  ✓ API responding: totalJobs=$($statsObj.processingJobs)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ API stats check failed (non-critical)" -ForegroundColor Yellow
}

# Check images appearing
Start-Sleep -Seconds 20
$imgCount = docker exec image-postgres psql -U image_user -d image_db -t -A -c "SELECT COUNT(*) FROM images" 2>$null
Write-Host "  → Images in DB: $imgCount" -ForegroundColor Gray

if ([int]$imgCount -gt 0) {
    Write-Host "  ✓ Data flow verified — images are being processed" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No images yet — sync worker may need configuration. Check image-sync-worker logs." -ForegroundColor Yellow
}

# ── Step 6: Start Monitoring ─────────────────────────────────────
Write-Host "`n[6/6] Starting monitoring (30-min intervals for 24h)..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $METRICS_DIR -Force | Out-Null

Write-Host "`n" + ("═" * 60) -ForegroundColor Cyan
Write-Host "  STAGE 1 LOAD TEST IN PROGRESS" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "  Start: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "  Duration: 24 hours" -ForegroundColor Cyan
Write-Host "  Cameras: 10 × 30s interval → ~28,800 images/day" -ForegroundColor Cyan
Write-Host "  TIFF size: 3-6 MB per file → ~86-172 GB raw data" -ForegroundColor Cyan
Write-Host "  Metrics output: $METRICS_DIR" -ForegroundColor Cyan
Write-Host "  Commands:" -ForegroundColor Cyan
Write-Host "    Check progress: docker logs image-tiff-writer --tail 20" -ForegroundColor Gray
Write-Host "    Check stats:     docker exec image-api wget -qO- http://localhost:3001/stats" -ForegroundColor Gray
Write-Host "    View metrics:    Get-ChildItem $METRICS_DIR | Sort-Object Name -Descending | Select-Object -First 5" -ForegroundColor Gray
Write-Host "  " + ("═" * 60) -ForegroundColor Cyan

# Launch monitor
docker exec -d image-api mkdir -p /tmp/metrics 2>$null
python "$LOADTEST\monitor.py" --output-dir "$METRICS_DIR" --interval 1800 --cycles 48 2>&1

Write-Host "`nMonitoring started. Use 'docker logs image-tiff-writer --tail 5' to check TIFF writer status." -ForegroundColor Green
