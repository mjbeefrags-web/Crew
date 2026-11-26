#Requires -Version 5.1
<#
.SYNOPSIS
  Start the Crewww Docker stack and wait until the API is ready.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -Rebuild
#>
[CmdletBinding()]
param(
  [switch]$Rebuild,
  [int]$TimeoutSeconds = 300
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Fail([string]$Message) {
  Write-Host "ERROR: $Message" -ForegroundColor Red
  exit 1
}

# 1. Docker daemon must be running.
docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Fail "Docker Desktop is not running. Start it, wait for 'Engine running', then retry."
}

# 2. Local environment file (defaults are fine for a laptop demo).
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Created .env from .env.example (local defaults)." -ForegroundColor Yellow
}

# 3. Resolve the published site port.
$webPort = 8080
$match = Select-String -Path .env -Pattern '^\s*WEB_PORT\s*=\s*(\d+)' | Select-Object -First 1
if ($match) { $webPort = [int]$match.Matches[0].Groups[1].Value }

# 4. Start the stack.
$composeArgs = @('compose', 'up', '-d')
if ($Rebuild) { $composeArgs += '--build' }
Write-Host "Starting: docker $($composeArgs -join ' ')" -ForegroundColor Cyan
& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  Fail "docker compose up failed. Run 'docker compose logs' for details."
}

# 5. Wait for the API readiness endpoint.
Write-Host "Waiting for http://localhost:$webPort/api/ready ..." -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing "http://localhost:$webPort/api/ready" -TimeoutSec 3
    if ($response.StatusCode -eq 200) { $ready = $true; break }
  } catch {
    Start-Sleep -Seconds 3
  }
}

docker compose ps

if (-not $ready) {
  Write-Host "API did not become ready within $TimeoutSeconds seconds." -ForegroundColor Red
  Write-Host "Inspect: docker compose logs migrate api" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "Ready." -ForegroundColor Green
Write-Host "  Storefront: http://localhost:$webPort"
Write-Host "  Admin:      http://localhost:$webPort/admin"
Write-Host "  Login:      http://localhost:$webPort/login"
Write-Host "  Admin user: admin@crewww.example.com / CrewwwOwner!2026"
exit 0
