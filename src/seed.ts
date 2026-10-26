import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Parser CSV minimal yang tahan terhadap koma di dalam field ber-tanda kutip.
 * Cukup untuk berkas seed APBD (kolom sumber mengandung koma).
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi (lihat .env.example).');
  console.error('Service role key hanya dipakai skrip seed, tidak boleh masuk ke frontend.');
  process.exit(1);
}

// Service role melewati RLS, itulah gunanya untuk seed.
const supabase = createClient(url, serviceKey);

const csvPath = join(import.meta.dir, '..', 'db', 'seeds', 'apbd-jakarta-2026.csv');
const rows = parseCsv(readFileSync(csvPath, 'utf-8'));
const header = rows[0];
const idx = (name: string) => header.indexOf(name);

const categories: { nama: string }[] = [];
const items: {
  kategori: string;
  nominal_rp: number;
  tahun: number;
  kota: string;
  sumber: string;
  status_verifikasi: string;
}[] = [];

for (const row of rows.slice(1)) {
  if (row.length < 2 || !row[idx('kategori')]) continue;
  const kategori = row[idx('kategori')];
  const nominalRaw = row[idx('nominal_rp')]?.trim();
  categories.push({ nama: kategori });
  items.push({
    kategori,
    nominal_rp: nominalRaw ? Number(nominalRaw) : 0,
    tahun: Number(row[idx('tahun')]),
    kota: row[idx('kota')],
    sumber: row[idx('sumber')] ?? '',
    status_verifikasi: row[idx('status_verifikasi')] ?? 'perlu_lampiran',
  });
}

const { error: catError } = await supabase
  .from('categories')
  .upsert(categories, { onConflict: 'nama' });
if (catError) {
  console.error('Gagal seed categories:', catError.message);
  process.exit(1);
}

const { error: delError } = await supabase.from('apbd_items').delete().neq('id', 0);
if (delError) {
  console.error('Gagal membersihkan apbd_items:', delError.message);
  process.exit(1);
}

const { error: itemError } = await supabase.from('apbd_items').insert(items);
if (itemError) {
  console.error('Gagal seed apbd_items:', itemError.message);
  process.exit(1);
}

const { error: configError } = await supabase.from('config').upsert(
  [
    { kunci: 'kota', nilai: process.env.KOTA ?? 'DKI Jakarta' },
    { kunci: 'tahun_anggaran', nilai: process.env.TAHUN_ANGGARAN ?? '2026' },
    {
      kunci: 'virtual_budget_per_warga',
      nilai: process.env.VIRTUAL_BUDGET_PER_WARGA ?? '10000000',
    },
  ],
  { onConflict: 'kunci' },
);
if (configError) {
  console.error('Gagal seed config:', configError.message);
  process.exit(1);
}

console.log(`Seed selesai: ${categories.length} kategori, ${items.length} apbd_items.`);
