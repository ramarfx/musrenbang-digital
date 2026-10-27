param(
  [string]$ProjectRef = 'dogyibbzwfslspflsidm',
  [switch]$PreflightOnly,
  [switch]$ExecuteRemoteWrites,
  [switch]$ConfirmFixtureCleanup,
  [switch]$ConfirmEmailPrerequisites,
  [switch]$RecoverCleanup,
  [switch]$ManagementConfigCheck,
  [switch]$IncludeReadOnlyDatabaseBaseline,
  [string]$RunId,
  [string]$WargaAEmail,
  [string]$WargaBEmail,
  [string]$AdminEmail
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$repoRoot = Split-Path $PSScriptRoot -Parent
$runner = Join-Path $PSScriptRoot 'remote-integration/runner.ts'
$allowedRef = 'dogyibbzwfslspflsidm'

function Read-SecretText([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secure.Dispose()
  }
}

if ($ProjectRef -cne $allowedRef) {
  throw 'Project ref di luar allowlist. Tidak ada koneksi yang dibuat.'
}
if ($PreflightOnly -and $ExecuteRemoteWrites) {
  throw 'Pilih PreflightOnly atau ExecuteRemoteWrites, jangan keduanya.'
}
if ($ExecuteRemoteWrites -and -not $ConfirmFixtureCleanup) {
  throw 'Mode tulis memerlukan -ConfirmFixtureCleanup. Tidak ada koneksi yang dibuat.'
}
if ($ExecuteRemoteWrites -and -not $RecoverCleanup -and -not $ConfirmEmailPrerequisites) {
  throw 'Mode Auth signup memerlukan -ConfirmEmailPrerequisites setelah prasyarat email dicek.'
}
if ($RecoverCleanup -and -not $ExecuteRemoteWrites) {
  throw 'Pemulihan cleanup memerlukan -ExecuteRemoteWrites dan -ConfirmFixtureCleanup.'
}
if ($RecoverCleanup -and -not $RunId) {
  throw 'Pemulihan cleanup memerlukan RunId dari manifest.'
}
if ($ExecuteRemoteWrites -and -not $RecoverCleanup -and (-not $WargaAEmail -or -not $WargaBEmail -or -not $AdminEmail)) {
  throw 'Mode tulis memerlukan WargaAEmail, WargaBEmail, dan AdminEmail mailbox uji.'
}
if ($ExecuteRemoteWrites -and -not $RunId) {
  $RunId = [guid]::NewGuid().ToString()
}
if (-not $RunId) { $RunId = [guid]::NewGuid().ToString() }
try { $RunId = ([guid]::ParseExact($RunId, 'D')).ToString().ToLowerInvariant() }
catch { throw 'RunId harus UUID v4 yang valid.' }

$branch = (& git -C $repoRoot branch --show-current 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -cne 'feat/backend-foundation-security') {
  throw 'Branch harus feat/backend-foundation-security. Tidak ada koneksi remote yang dibuat.'
}
if (-not (Test-Path -LiteralPath $runner)) { throw 'Runner TypeScript tidak ditemukan.' }
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) { throw 'Bun tidak tersedia.' }

$envNames = @(
  'REMOTE_SUPABASE_URL', 'REMOTE_SUPABASE_ANON_KEY', 'REMOTE_SUPABASE_SERVICE_KEY',
  'REMOTE_DATABASE_URL', 'REMOTE_MANAGEMENT_TOKEN', 'REMOTE_WARGA_A_EMAIL',
  'REMOTE_WARGA_B_EMAIL', 'REMOTE_ADMIN_EMAIL'
)
$savedEnv = @{}
foreach ($name in $envNames) { $savedEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

try {
  $env:REMOTE_SUPABASE_URL = "https://$allowedRef.supabase.co"
  Write-Output "Target allowlist: $allowedRef; branch: $branch; mode: $(if ($ExecuteRemoteWrites) {'REMOTE WRITE, explicit approval flags present'} else {'PREFLIGHT ONLY'})"
  Write-Output "Run ID: $RunId"

  $anonKey = Read-SecretText 'Masukkan anon/publishable API key proyek Musrenbang'
  if ([string]::IsNullOrWhiteSpace($anonKey)) { throw 'API key kosong; proses dihentikan sebelum koneksi.' }
  $env:REMOTE_SUPABASE_ANON_KEY = $anonKey
  $anonKey = $null

  if ($ManagementConfigCheck) {
    $managementToken = Read-SecretText 'Masukkan Supabase Management API token untuk GET config/auth (opsional, read-only)'
    $env:REMOTE_MANAGEMENT_TOKEN = $managementToken
    $managementToken = $null
  }

  if ($IncludeReadOnlyDatabaseBaseline -or ($ExecuteRemoteWrites -and -not $RecoverCleanup)) {
    $dbPassword = Read-SecretText 'Masukkan password PostgreSQL untuk db.dogyibbzwfslspflsidm.supabase.co'
    if ([string]::IsNullOrWhiteSpace($dbPassword)) { throw 'Password database kosong; proses dihentikan.' }
    $escapedPassword = [uri]::EscapeDataString($dbPassword)
    $env:REMOTE_DATABASE_URL = "postgresql://postgres:$escapedPassword@db.$allowedRef.supabase.co:5432/postgres?sslmode=require"
    $dbPassword = $null
    $escapedPassword = $null
  }

  $arguments = @('run', $runner, "--run-id=$RunId")
  if ($ExecuteRemoteWrites) {
    $serviceKey = Read-SecretText 'Masukkan service_role/secret key proyek Musrenbang'
    if ([string]::IsNullOrWhiteSpace($serviceKey)) { throw 'Service key kosong; proses dihentikan.' }
    $env:REMOTE_SUPABASE_SERVICE_KEY = $serviceKey
    $serviceKey = $null
    if (-not $RecoverCleanup) {
      $env:REMOTE_WARGA_A_EMAIL = $WargaAEmail
      $env:REMOTE_WARGA_B_EMAIL = $WargaBEmail
      $env:REMOTE_ADMIN_EMAIL = $AdminEmail
    }
    $arguments += @('--execute', '--confirm-cleanup')
    if ($ConfirmEmailPrerequisites) { $arguments += '--confirm-email-prerequisites' }
    if ($RecoverCleanup) { $arguments += '--recover-cleanup' }
  }

  & bun @arguments
  $runnerExit = $LASTEXITCODE
  if ($runnerExit -ne 0) { throw "Runner gagal dengan exit code $runnerExit. Periksa pesan aman dan manifest .tmp/remote-integration/$RunId.json." }
} finally {
  foreach ($name in $envNames) {
    [Environment]::SetEnvironmentVariable($name, $savedEnv[$name], 'Process')
  }
  $anonKey = $null; $serviceKey = $null; $dbPassword = $null
  $managementToken = $null; $escapedPassword = $null
}
