<#
.SYNOPSIS
  Back up the Crewww PostgreSQL database from the running Docker Compose stack.

.DESCRIPTION
  Writes a custom-format dump to daily/weekly/monthly folders and prunes old
  copies. Defaults match the documented policy: 7 daily, 4 weekly, 2 monthly.

.EXAMPLE
  ./scripts/backup-postgres.ps1
  ./scripts/backup-postgres.ps1 -OutputDir D:\backups\crewww -KeepDaily 14
#>
[CmdletBinding()]
param(
  [string]$OutputDir = "./backups",
  [string]$Service = "db",
  [string]$Database = $env:POSTGRES_DB,
  [string]$User = $env:POSTGRES_USER,
  [int]$KeepDaily = 7,
  [int]$KeepWeekly = 4,
  [int]$KeepMonthly = 2
)

$ErrorActionPreference = "Stop"

if (-not $Database) { $Database = "crewww" }
if (-not $User) { $User = "crewww" }

$root = Resolve-Path . | Select-Object -ExpandProperty Path
$output = if ([System.IO.Path]::IsPathRooted($OutputDir)) { $OutputDir } else { Join-Path $root $OutputDir }
$daily = Join-Path $output "daily"
$weekly = Join-Path $output "weekly"
$monthly = Join-Path $output "monthly"
New-Item -ItemType Directory -Force -Path $daily, $weekly, $monthly | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$name = "crewww_$stamp.dump"
$path = Join-Path $daily $name

Write-Host "Dumping $Database from service '$Service' -> $path"
docker compose exec -T $Service pg_dump -U $User -d $Database --format=custom --compress=9 |
  Set-Content -Path $path -Encoding Byte

if (-not (Test-Path $path) -or (Get-Item $path).Length -lt 1024) {
  throw "Backup failed or produced an empty file: $path"
}

# Verify the dump is readable before considering the run successful.
docker compose exec -T $Service pg_restore --list - < $path | Out-Null
Write-Host ("Backup OK ({0:N1} MB)" -f ((Get-Item $path).Length / 1MB))

$today = Get-Date
if ($today.DayOfWeek -eq [System.DayOfWeek]::Sunday) {
  Copy-Item $path (Join-Path $weekly $name)
}
if ($today.Day -eq 1) {
  Copy-Item $path (Join-Path $monthly $name)
}

function Remove-Oldest([string]$Folder, [int]$Keep) {
  if ($Keep -le 0 -or -not (Test-Path $Folder)) { return }
  Get-ChildItem -Path $Folder -Filter "*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep |
    ForEach-Object {
      Write-Host "Pruning $($_.FullName)"
      Remove-Item $_.FullName -Force
    }
}

Remove-Oldest $daily $KeepDaily
Remove-Oldest $weekly $KeepWeekly
Remove-Oldest $monthly $KeepMonthly
