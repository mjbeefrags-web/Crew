<#
.SYNOPSIS
  Refresh a local PostgreSQL database from the deployed Neon database.

.DESCRIPTION
  Reads the direct (unpooled) Neon connection string from a DPAPI-encrypted
  file, dumps the deployed database with pg_dump, verifies the archive, then
  restores it into the local database named by DATABASE_URL in .env.

  Designed to run unattended from Windows Task Scheduler while the user is
  logged on. When the machine is offline it logs a single line and exits 0 so
  a missed/Wi-Fi-down run is not reported as a failure.

.EXAMPLE
  .\scripts\sync-from-neon.ps1
  .\scripts\sync-from-neon.ps1 -KeepDumps 14
#>
[CmdletBinding()]
param(
  [string]$EnvFile = "",
  [string]$SecretFile = "",
  [string]$PgBin = "C:\Program Files\PostgreSQL\18\bin",
  [string]$DumpRoot = "",
  [string]$LogRoot = "",
  [int]$KeepDumps = 7
)

$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $EnvFile) {
  $backendEnv = Join-Path $scriptRoot "..\backend\.env"
  $EnvFile = if (Test-Path $backendEnv) { $backendEnv } else { Join-Path $scriptRoot "..\.env" }
}
if (-not $SecretFile) { $SecretFile = "$env:LOCALAPPDATA\crewww\neon-direct.url" }
if (-not $DumpRoot) { $DumpRoot = Join-Path $scriptRoot "..\backups\neon" }
if (-not $LogRoot) { $LogRoot = Join-Path $scriptRoot "..\logs" }

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -Path $script:LogPath -Value $line -Encoding UTF8
}

function Read-DotEnv([string]$Path) {
  $values = @{}
  if (-not (Test-Path $Path)) { return $values }
  foreach ($line in Get-Content -Path $Path) {
    if ($line -match '^\s*(#|$)') { continue }
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim()
      if ($value.Length -ge 2 -and
          (($value.StartsWith('"') -and $value.EndsWith('"')) -or
           ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $values[$key] = $value
    }
  }
  return $values
}

function Read-EncryptedSecret([string]$Path) {
  if (-not (Test-Path $Path)) {
    throw "Neon credential file not found: $Path (run the one-time sign-in setup)"
  }
  $encrypted = (Get-Content -Path $Path -Raw).Trim()
  $secure = $encrypted | ConvertTo-SecureString
  return [System.Net.NetworkCredential]::new("", $secure).Password
}

function Add-ConnectTimeout([string]$Url, [int]$Seconds) {
  if ($Url -match '[?&]connect_timeout=') { return $Url }
  $separator = if ($Url.Contains("?")) { "&" } else { "?" }
  return "$Url" + $separator + "connect_timeout=" + $Seconds
}

function Convert-ToLibpqUrl([string]$Url) {
  return $Url -replace '^postgresql\+asyncpg://', 'postgresql://'
}

New-Item -ItemType Directory -Force -Path $DumpRoot, $LogRoot | Out-Null
$script:LogPath = Join-Path $LogRoot "sync-neon.log"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tmpDump = Join-Path $DumpRoot "neon_$stamp.tmp.dump"
$finalDump = Join-Path $DumpRoot "neon_$stamp.dump"

try {
  $sourceUrl = Add-ConnectTimeout (Read-EncryptedSecret $SecretFile) 10
  $envValues = Read-DotEnv $EnvFile
  if (-not $envValues.ContainsKey("DATABASE_URL") -or -not $envValues["DATABASE_URL"]) {
    throw "DATABASE_URL is missing from $EnvFile (set it to the local crewww_live database)"
  }
  $targetUrl = Add-ConnectTimeout (Convert-ToLibpqUrl $envValues["DATABASE_URL"]) 10

  $pgDump = Join-Path $PgBin "pg_dump.exe"
  $pgRestore = Join-Path $PgBin "pg_restore.exe"
  $psql = Join-Path $PgBin "psql.exe"
  $pgIsReady = Join-Path $PgBin "pg_isready.exe"
  foreach ($tool in @($pgDump, $pgRestore, $psql, $pgIsReady)) {
    if (-not (Test-Path $tool)) { throw "PostgreSQL client tool not found: $tool" }
  }

  # Offline / Neon compute asleep / Wi-Fi down: quiet success, retry next tick.
  & $pgIsReady -d $sourceUrl -q 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Log "Neon not reachable; skipping this refresh (will retry on next schedule)."
    exit 0
  }

  Write-Log "Dumping deployed Neon database."
  & $pgDump $sourceUrl --format=custom --compress=9 --no-owner --no-privileges --file=$tmpDump 2>&1 |
    ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tmpDump) -or (Get-Item $tmpDump).Length -lt 1024) {
    throw "pg_dump failed or produced an empty archive"
  }

  & $pgRestore --list $tmpDump 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Dump verification failed (pg_restore --list)" }
  Move-Item -Path $tmpDump -Destination $finalDump -Force
  $sizeMb = [math]::Round((Get-Item $finalDump).Length / 1MB, 2)
  Write-Log "Dump verified: $([System.IO.Path]::GetFileName($finalDump)) ($sizeMb MB)."

  # Neon may run a newer PostgreSQL minor than the local server (e.g. 18.7
  # vs 18.3). The newer server emits an internal `pg_attver` column setting
  # that older minors reject. Strip only that marker from the SQL; schema and
  # data are unaffected. psql --single-transaction keeps the swap atomic.
  Write-Log "Restoring into local database."
  $sql = & $pgRestore --clean --if-exists --no-owner --no-privileges -f - $finalDump 2>$null
  if ($LASTEXITCODE -ne 0) { throw "Could not render dump as SQL; last good dump retained at $finalDump" }
  $sql = $sql | Where-Object { $_ -notmatch 'pg_attver' }
  $sql | & $psql $targetUrl --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -q -f - 2>&1 |
    ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "Restore failed; last good dump retained at $finalDump" }

  $counts = & $psql $targetUrl -Atc "select (select count(*) from pg_catalog.pg_tables where schemaname='public'), (select count(*) from public.products);" 2>$null
  if ($LASTEXITCODE -eq 0 -and $counts) {
    Write-Log "Verified local database: $($counts -replace '\|', ' tables, ') products."
  } else {
    Write-Log "Warning: post-restore row-count check could not run."
  }

  Get-ChildItem -Path $DumpRoot -Filter "neon_*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $KeepDumps |
    ForEach-Object { Remove-Item $_.FullName -Force }

  Write-Log "Refresh complete."
  exit 0
}
catch {
  Write-Log "FAILED: $($_.Exception.GetType().Name): $($_.Exception.Message)"
  Write-Log "Location: $($_.InvocationInfo.PositionMessage)"
  if (Test-Path $tmpDump) { Remove-Item $tmpDump -Force }
  exit 1
}
