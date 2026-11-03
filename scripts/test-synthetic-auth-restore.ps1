# SYNTHETIC LOCAL DRILL ONLY. Uses exact local Docker container and fresh databases.
# This is not a production backup or a managed Supabase restore procedure.
# It intentionally omits ownership and grants; those require separate validation.
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = (Get-Location).Path
$instance = 'supabase_db_foundation-local'
$tag = [guid]::NewGuid().ToString('N').Substring(0,12)
$source = "musrenai_restore_src_$tag"
$dest = "musrenai_restore_dst_$tag"
$base = "/tmp/musrenai_restore_$tag"
$created = [System.Collections.Generic.List[string]]::new()
function AssertExit([string]$step) { if($LASTEXITCODE -ne 0) { throw "$step gagal" } }
try {
  docker exec $instance pg_dump -U supabase_admin -d postgres --schema=auth --schema-only -Fc -f "$base-auth.dump"
  AssertExit 'Dump schema Auth lokal'
  foreach($db in @($source,$dest)) {
    if($db -notmatch '^musrenai_restore_(src|dst)_[a-f0-9]{12}$') { throw 'Nama fixture tidak valid' }
    docker exec $instance createdb -U supabase_admin -T template0 $db
    AssertExit 'Membuat database fixture'
    $created.Add($db)
  }
  docker exec $instance pg_restore -U supabase_admin -d $source --no-owner --no-acl --exit-on-error "$base-auth.dump"
  AssertExit 'Restore schema Auth ke sumber'
  $files = Get-ChildItem 'supabase/migrations/*.sql' | Sort-Object Name | Select-Object -First 10
  if($files.Count -ne 10 -or $files[-1].Name -ne '20261102141207_priority_rankings.sql') { throw 'Urutan migration fixture tidak cocok' }
  foreach($file in $files) {
    Get-Content -LiteralPath $file.FullName -Raw | docker exec -i $instance psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin -d $source
    AssertExit "Migration lokal $($file.Name)"
  }
  $fixture = @"
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('c1000000-0000-4000-8000-000000000001','backup-fixture@example.invalid','{"nama":"Fixture"}');
INSERT INTO public.proposals(judul,deskripsi,kategori,pengusul_id,estimasi_biaya) VALUES ('Jalan sintetis rusak','Perlu pemeriksaan jalan sintetis untuk latihan lokal.','Infrastruktur dan Jalan','c1000000-0000-4000-8000-000000000001',1000);
"@
  $fixture | docker exec -i $instance psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin -d $source
  AssertExit 'Membuat data sintetis'
  docker exec $instance pg_dump -U supabase_admin -d $source -Fc --schema-only -n auth -n public -n private -f "$base-schema.dump"
  AssertExit 'Dump schema sintetis'
  docker exec $instance pg_dump -U supabase_admin -d $source -Fc --data-only -n auth -n public -n private -f "$base-data.dump"
  AssertExit 'Dump data sintetis'
  docker exec $instance psql -U supabase_admin -d $dest -q -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public;'
  AssertExit 'Menyiapkan target kosong'
  docker exec $instance pg_restore -U supabase_admin -d $dest --no-owner --no-acl --exit-on-error "$base-schema.dump"
  AssertExit 'Restore schema sintetis'
  docker exec $instance pg_restore -U supabase_admin -d $dest --no-owner --no-acl --disable-triggers --exit-on-error "$base-data.dump"
  AssertExit 'Restore data sintetis'
  $check = docker exec $instance psql -U supabase_admin -d $dest -Atc "select (select count(*) from auth.users where email='backup-fixture@example.invalid'),(select count(*) from public.profiles where id='c1000000-0000-4000-8000-000000000001'),(select count(*) from public.proposals where pengusul_id='c1000000-0000-4000-8000-000000000001')"
  AssertExit 'Verifikasi hasil restore'
  if($check.Trim() -ne '1|1|1') { throw 'Hitungan fixture hasil restore tidak cocok' }
  Write-Output 'SYNTHETIC_AUTH_APPLICATION_RESTORE_OK: 1 user, 1 profile, 1 proposal'
} finally {
  $cleanupFailed = $false
  foreach($db in $created) {
    if($db -match '^musrenai_restore_(src|dst)_[a-f0-9]{12}$') {
      docker exec $instance dropdb -U supabase_admin $db
      if($LASTEXITCODE -ne 0) { $cleanupFailed = $true }
    }
  }
  if($base -match '^/tmp/musrenai_restore_[a-f0-9]{12}$') {
    foreach($suffix in @('-auth.dump','-schema.dump','-data.dump')) {
      docker exec $instance rm -f -- "$base$suffix"
      if($LASTEXITCODE -ne 0) { $cleanupFailed = $true }
    }
  }
  if($cleanupFailed) { throw "Cleanup fixture restore gagal: $tag" }
}
