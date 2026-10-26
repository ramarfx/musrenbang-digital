param(
  [string]$DatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  [string]$PsqlPath = 'psql'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$target = [Uri]$DatabaseUrl
if ($target.Host -notin @('127.0.0.1', 'localhost', '[::1]', '::1')) {
  throw 'Runner ini hanya menerima database lokal. Tidak menjalankan migration remote.'
}
if (-not (Get-Command $PsqlPath -ErrorAction SilentlyContinue)) {
  $windowsPsql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
  if (Test-Path -LiteralPath $windowsPsql) { $PsqlPath = $windowsPsql }
  else { throw 'psql tidak ditemukan. Isi parameter -PsqlPath.' }
}

$outputDir = Join-Path $repoRoot '.tmp/backend-tests'
New-Item -ItemType Directory -Force $outputDir | Out-Null
$payloadPath = Join-Path $outputDir 'foundation-dry-run.sql'
$logPath = Join-Path $outputDir 'foundation.log'
$sqlParts = [System.Collections.Generic.List[string]]::new()
$sqlParts.Add('BEGIN;')
$sqlParts.Add("SET LOCAL statement_timeout = '30s';")
$sqlParts.Add("SET LOCAL lock_timeout = '5s';")
$migrations = Get-ChildItem (Join-Path $repoRoot 'supabase/migrations/*.sql') | Sort-Object Name
foreach ($migration in $migrations) {
  $migrationSql = Get-Content -LiteralPath $migration.FullName -Raw
  if ($migrationSql -match '(?im)^\s*(BEGIN|COMMIT|ROLLBACK)\s*;') {
    throw "Kontrol transaksi tidak diizinkan di migration: $($migration.Name)"
  }
  $sqlParts.Add($migrationSql)
  $sqlParts.Add("SELECT 'MIGRATION_OK: $($migration.Name)';")
}
$testSql = Get-Content (Join-Path $repoRoot 'supabase/tests/foundation_security.sql') -Raw
$expectedChecks = ([regex]::Matches($testSql, '(?m)^SELECT pg_temp\.(check_true|expect_error)\(')).Count
# Satu transaksi mencakup seluruh migration dan fixture tes.
$testSql = $testSql -replace '(?m)^BEGIN;\r?$', '' -replace '(?m)^ROLLBACK;\r?$', ''
if ($testSql -match '(?im)^\s*COMMIT\b') { throw 'COMMIT tidak boleh ada di tes.' }
$sqlParts.Add($testSql)
$sqlParts.Add('ROLLBACK;')
$sqlParts.Add("SELECT 'ROLLBACK_OK';")
Set-Content -LiteralPath $payloadPath -Value ($sqlParts -join "`n") -Encoding utf8

# ON_ERROR_STOP membuat psql keluar dengan kode 3 pada error SQL. Koneksi ditutup
# sehingga transaksi aktif dibatalkan PostgreSQL, termasuk ketika ROLLBACK terakhir
# belum tercapai. Tidak menggunakan --single-transaction karena payload memilikinya.
$previousEncoding = $env:PGCLIENTENCODING
$env:PGCLIENTENCODING = 'UTF8'
try {
  $output = & $PsqlPath --no-psqlrc --no-password --quiet --tuples-only --no-align `
    --set=ON_ERROR_STOP=1 --dbname=$DatabaseUrl --file=$payloadPath 2>&1
  $resultCode = $LASTEXITCODE
  $output | Set-Content -LiteralPath $logPath -Encoding utf8
  $output | Where-Object { "$_" -match 'MIGRATION_OK:|ROLLBACK_OK|"lulus"|ERROR:|CONTEXT:|GAGAL:' } |
    ForEach-Object { Write-Output "$_" }
  if ($resultCode -ne 0) { throw "Tes database gagal (psql exit $resultCode). Log: $logPath" }
  if (-not ($output -match '^ROLLBACK_OK$')) { throw 'Marker ROLLBACK tidak diterima.' }
  $summaryLine = $output | Where-Object { "$_" -match '^\{.*"lulus"\s*:' } | Select-Object -Last 1
  if (-not $summaryLine) { throw 'Ringkasan assertion tidak ditemukan.' }
  $summary = "$summaryLine" | ConvertFrom-Json
  if ($summary.gagal -ne 0 -or $summary.lulus -ne $expectedChecks) {
    throw "Jumlah assertion tidak sesuai: diharapkan $expectedChecks."
  }
  Write-Output "Database: $($summary.lulus) lulus, $($summary.gagal) gagal. Log: $logPath"
} finally {
  # Pemeriksaan terpisah tetap berjalan ketika ON_ERROR_STOP menghentikan batch.
  $postcheckSql = @'
SELECT jsonb_build_object(
  'tabel_aplikasi', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('profiles','proposals','comments','votes',
      'allocations','proposal_status_history','categories','apbd_items','config',
      'v_proposals','v_comments','v_proposal_status_history','v_gap')),
  'akun_fixture', (SELECT count(*) FROM auth.users WHERE id IN (
    '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333')),
  'transaksi_aborted', (SELECT count(*) FROM pg_stat_activity
    WHERE datname=current_database() AND state='idle in transaction (aborted)')
);
'@
  try {
    $postcheck = & $PsqlPath -X -w -q -A -t --set=ON_ERROR_STOP=1 --dbname=$DatabaseUrl `
      --command=$postcheckSql
    if ($LASTEXITCODE -ne 0) { throw 'Pemeriksaan cleanup database gagal.' }
    $postcheck | Add-Content -LiteralPath $logPath -Encoding utf8
    $cleanup = "$postcheck" | ConvertFrom-Json
    if ($cleanup.tabel_aplikasi -ne 0 -or $cleanup.akun_fixture -ne 0 -or $cleanup.transaksi_aborted -ne 0) {
      throw "Database pengujian tidak bersih: $postcheck"
    }
    Write-Output "Cleanup terverifikasi: $postcheck"
  } finally {
    $env:PGCLIENTENCODING = $previousEncoding
  }
}
