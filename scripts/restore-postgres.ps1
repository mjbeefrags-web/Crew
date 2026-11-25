<#
.SYNOPSIS
  Restore a Crewww PostgreSQL dump into the running Compose database.

.EXAMPLE
  ./scripts/restore-postgres.ps1 -Dump .\backups\daily\crewww_20261125_020000.dump
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Dump,
  [string]$Service = "db",
  [string]$Database = $env:POSTGRES_DB,
  [string]$User = $env:POSTGRES_USER,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
if (-not $Database) { $Database = "crewww" }
if (-not $User) { $User = "crewww" }
if (-not (Test-Path $Dump)) { throw "Dump not found: $Dump" }

if (-not $Force) {
  $answer = Read-Host "This replaces data in '$Database'. Type 'restore' to continue"
  if ($answer -ne "restore") { Write-Host "Aborted"; exit 1 }
}

Write-Host "Restoring $Dump into $Database (service '$Service')"
Get-Content -Path $Dump -Encoding Byte |
  docker compose exec -T $Service pg_restore -U $User -d $Database --clean --if-exists --single-transaction

Write-Host "Restore complete. Run migrations and a readiness check:"
Write-Host "  docker compose run --rm migrate"
Write-Host "  curl.exe -fsS http://127.0.0.1:8080/api/ready"
