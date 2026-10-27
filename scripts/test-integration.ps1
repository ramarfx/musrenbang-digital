param(
  [switch]$KeepRunning,
  [switch]$ConcurrencyOnly,
  [ValidatePattern('^[a-z0-9-]{1,16}$')]
  [string]$EnvironmentSuffix = ''
)

$ErrorActionPreference = 'Stop'
# Bun/Supabase CLI dapat menulis status progres biasa ke stderr. Jangan perlakukan
# itu sebagai terminating error; setiap pemanggilan tetap memeriksa $LASTEXITCODE.
$PSNativeCommandUseErrorActionPreference = $false
$repoRoot = Split-Path $PSScriptRoot -Parent
$projectId = 'musrenbang-integration'
$workdirName = 'integration-local'
if ($EnvironmentSuffix) {
  $projectId = "musrenbang-integration-$EnvironmentSuffix"
  $workdirName = "integration-local-$EnvironmentSuffix"
}
$workdir = Join-Path (Join-Path $repoRoot '.tmp') $workdirName
$localSupabase = Join-Path $workdir 'supabase'
New-Item -ItemType Directory -Force (Join-Path $localSupabase 'migrations') | Out-Null
$config = Get-Content -LiteralPath (Join-Path $repoRoot 'supabase/integration/config.toml') -Raw
$config = [regex]::Replace(
  $config,
  '(?m)^project_id\s*=\s*"[^"]+"\s*$',
  ('project_id = "{0}"' -f $projectId)
)
$configPath = Join-Path $localSupabase 'config.toml'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($configPath, $config, $utf8NoBom)
Get-ChildItem (Join-Path $repoRoot 'supabase/migrations/*.sql') | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $localSupabase 'migrations')
}

$previousAnon = $env:INTEGRATION_ANON_KEY
$previousServiceRole = $env:INTEGRATION_SERVICE_ROLE_KEY
$previousDatabase = $env:INTEGRATION_DATABASE_URL
try {
  Write-Output 'Memulai Supabase integration lokal: database, Auth, REST, gateway, dan Mailpit.'
  # CLI bisa mencetak key pada startup/status. Tangkap hanya di memori, jangan ke log.
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $startup = & bunx --bun supabase --workdir $workdir start `
      --exclude realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor 2>&1
    $startupExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if ($startupExitCode -ne 0) { throw 'Startup lokal gagal. Periksa Docker dan konfigurasi integration.' }
  $null = $startup
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $migrationOutput = & bunx --bun supabase --workdir $workdir db push --local --skip-vault 2>&1
    $migrationExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if ($migrationExitCode -ne 0) { throw 'Penerapan migration lokal gagal. Remote tidak diakses.' }
  $null = $migrationOutput
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $statusOutput = & bunx --bun supabase --workdir $workdir status --output json 2>$null
    $statusExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if ($statusExitCode -ne 0) { throw 'Status Supabase lokal tidak tersedia.' }
  $status = ($statusOutput -join "`n") | ConvertFrom-Json
  if ($status.API_URL -ne 'http://127.0.0.1:55421' -or
      -not $status.SERVICE_ROLE_KEY -or
      $status.DB_URL -notmatch '@127\.0\.0\.1:55422/postgres$') {
    throw 'Alamat layanan tidak sesuai proyek integration lokal.'
  }
  $env:INTEGRATION_ANON_KEY = $status.ANON_KEY
  $env:INTEGRATION_SERVICE_ROLE_KEY = $status.SERVICE_ROLE_KEY
  $env:INTEGRATION_DATABASE_URL = $status.DB_URL
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  if ($ConcurrencyOnly) {
    try {
      & bun run (Join-Path $PSScriptRoot 'integration/run.ts') --concurrency-only 2>&1
      $testExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorAction
    }
  } else {
    try {
      & bun run (Join-Path $PSScriptRoot 'integration/run.ts') 2>&1
      $testExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorAction
    }
  }
  if ($testExitCode -ne 0) { throw 'Tes integrasi gagal. Lihat ringkasan tanpa kredensial di .tmp/integration-results/.' }
} finally {
  $env:INTEGRATION_ANON_KEY = $previousAnon
  $env:INTEGRATION_SERVICE_ROLE_KEY = $previousServiceRole
  $env:INTEGRATION_DATABASE_URL = $previousDatabase
  $statusOutput = $null
  $status = $null
  if (-not $KeepRunning) {
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $stopOutput = & bunx --bun supabase --workdir $workdir stop --project-id $projectId 2>&1
      $stopExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorAction
    }
    if ($stopExitCode -ne 0) { Write-Warning 'Container integration belum dapat dihentikan.' }
    $null = $stopOutput
  }
}
