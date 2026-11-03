$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = Split-Path $PSScriptRoot -Parent
$name = 'musrenai_quota_test_' + [guid]::NewGuid().ToString('N').Substring(0,16)
$container = 'supabase_db_foundation-local'
$created = $false
try {
  $identity = docker inspect --format '{{.Name}}' $container
  if ($LASTEXITCODE -ne 0 -or $identity.Trim() -ne "/$container") { throw 'Container lokal tidak tersedia' }
  docker exec $container createdb -U postgres $name
  if ($LASTEXITCODE -ne 0) { throw 'Gagal membuat database fixture' }
  $created = $true
  docker exec $container psql -X -v ON_ERROR_STOP=1 -U postgres -d $name -c 'CREATE SCHEMA private;' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Gagal membuat schema fixture' }
  foreach ($file in @('20261103102540_musrenai_shared_provider_quota.sql', '20261103154800_musrenai_provider_rolling_limits.sql')) {
    Get-Content -Raw -LiteralPath (Join-Path $root "supabase/migrations/$file") |
      docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d $name | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Migration fixture gagal' }
  }
  $env:MUSRENAI_QUOTA_TEST_DATABASE = $name
  bun run (Join-Path $root 'scripts/test-musrenai-quota-concurrency.ts')
  if ($LASTEXITCODE -ne 0) { throw 'Tes concurrency gagal' }
} finally {
  Remove-Item Env:MUSRENAI_QUOTA_TEST_DATABASE -ErrorAction SilentlyContinue
  if ($created -and $name -match '^musrenai_quota_test_[a-f0-9]{16}$') {
    docker exec $container dropdb -U postgres $name
    if ($LASTEXITCODE -ne 0) { Write-Error "Cleanup database fixture $name gagal" }
  }
}
