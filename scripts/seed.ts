import {
  DEFAULT_CATEGORIES,
  apbdSeedSchema,
  proposalSeedSchema,
  seedEnvSchema,
  type ApbdSeed,
  type Database,
  type ProposalSeed,
} from '@musrenbang/shared';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { assertSeedSchemaReady } from './seed-preflight';

/**
 * Parser CSV minimal yang tahan terhadap koma di dalam field ber-tanda kutip.
 * Cukup untuk berkas seed APBD (kolom sumber mengandung koma).
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
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

function printZodError(label: string, error: z.ZodError): void {
  console.error(`${label} tidak valid:`);
  for (const issue of error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
}

const envResult = seedEnvSchema.safeParse(process.env);
if (!envResult.success) {
  printZodError('Environment seed', envResult.error);
  console.error('Lihat .env.example. Service role key hanya untuk seed, bukan frontend.');
  process.exit(1);
}

const env = envResult.data;
const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const seedDir = join(import.meta.dir, '..', 'supabase', 'seed');
const csvPath = join(seedDir, 'apbd-jakarta-2026.csv');
const proposalsPath = join(seedDir, 'proposals-contoh.json');

// ---------------------------------------------------------------------------
// APBD
// ---------------------------------------------------------------------------

const rows = parseCsv(readFileSync(csvPath, 'utf-8'));
const header = rows[0] ?? [];
const requiredColumns = [
  'kategori',
  'nominal_rp',
  'tahun',
  'kota',
  'sumber',
  'status_verifikasi',
] as const;

for (const column of requiredColumns) {
  if (!header.includes(column)) {
    console.error(`Kolom "${column}" tidak ditemukan di ${csvPath}.`);
    process.exit(1);
  }
}

const columnIndex = (name: string) => header.indexOf(name);
const apbdItems: ApbdSeed[] = [];
let skippedApbdWithoutAmount = 0;

for (const row of rows.slice(1)) {
  if (row.length < 2 || !row[columnIndex('kategori')]) continue;
  if (!row[columnIndex('nominal_rp')]?.trim()) {
    skippedApbdWithoutAmount += 1;
    continue;
  }
  const parsed = apbdSeedSchema.safeParse({
    kategori: row[columnIndex('kategori')]?.trim(),
    nominal_rp: Number(row[columnIndex('nominal_rp')]?.trim()),
    tahun: Number(row[columnIndex('tahun')]),
    kota: row[columnIndex('kota')]?.trim(),
    sumber: row[columnIndex('sumber')] ?? '',
    sumber_url:
      header.includes('sumber_url') && row[columnIndex('sumber_url')]?.trim()
        ? row[columnIndex('sumber_url')]?.trim()
        : null,
    catatan_pemetaan:
      header.includes('catatan_pemetaan') && row[columnIndex('catatan_pemetaan')]?.trim()
        ? row[columnIndex('catatan_pemetaan')]?.trim()
        : null,
    status_verifikasi: row[columnIndex('status_verifikasi')] ?? 'perlu_lampiran',
  });
  if (!parsed.success) {
    printZodError(`Baris APBD untuk ${row[columnIndex('kategori')]}`, parsed.error);
    process.exit(1);
  }
  apbdItems.push(parsed.data);
}

// ---------------------------------------------------------------------------
// Usulan contoh
// ---------------------------------------------------------------------------

const proposalsJson: unknown = JSON.parse(readFileSync(proposalsPath, 'utf-8'));
const proposalsResult = z.array(proposalSeedSchema).safeParse(proposalsJson);
if (!proposalsResult.success) {
  printZodError('Berkas usulan contoh', proposalsResult.error);
  process.exit(1);
}
const proposals: ProposalSeed[] = proposalsResult.data;

// ---------------------------------------------------------------------------
// Pastikan seluruh kontrak migration MVP ada sebelum menyentuh data. Tanpa guard
// ini schema enam migration dapat menghapus APBD lalu gagal saat insert kolom baru.
// ---------------------------------------------------------------------------

const [apbdSchema, historySchema, gapSchema] = await Promise.all([
  supabase.from('apbd_items').select('sumber_url,catatan_pemetaan').limit(0),
  supabase.from('proposal_status_history').select('catatan').limit(0),
  supabase.from('v_gap').select('jumlah_partisipan,apbd_tersedia').limit(0),
]);

try {
  assertSeedSchemaReady([
    { resource: 'apbd_items provenance', error: apbdSchema.error },
    { resource: 'proposal status notes', error: historySchema.error },
    { resource: 'v_gap statistics', error: gapSchema.error },
  ]);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Schema seed tidak siap.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tulis ke Supabase (service role melewati RLS)
// ---------------------------------------------------------------------------

const categoryNames = [
  ...new Set([...DEFAULT_CATEGORIES, ...apbdItems.map((item) => item.kategori)]),
];

const { error: categoryError } = await supabase.from('categories').upsert(
  categoryNames.map((nama) => ({ nama })),
  { onConflict: 'nama' },
);
if (categoryError) {
  console.error('Gagal seed categories:', categoryError.message);
  process.exit(1);
}

const { error: deleteApbdError } = await supabase.from('apbd_items').delete().neq('id', 0);
if (deleteApbdError) {
  console.error('Gagal membersihkan apbd_items:', deleteApbdError.message);
  process.exit(1);
}

const { error: apbdError } = await supabase.from('apbd_items').insert(apbdItems);
if (apbdError) {
  console.error('Gagal seed apbd_items:', apbdError.message);
  process.exit(1);
}

const { error: configError } = await supabase.from('config').upsert(
  [
    { kunci: 'kota', nilai: env.KOTA },
    { kunci: 'tahun_anggaran', nilai: String(env.TAHUN_ANGGARAN) },
    {
      kunci: 'virtual_budget_per_warga',
      nilai: String(env.VIRTUAL_BUDGET_PER_WARGA),
    },
  ],
  { onConflict: 'kunci' },
);
if (configError) {
  console.error('Gagal seed config:', configError.message);
  process.exit(1);
}

// Hanya usulan tanpa pengusul yang dihapus dan dimuat ulang, supaya usulan
// warga asli tidak ikut terhapus saat seed diulang.
const { error: deleteProposalError } = await supabase
  .from('proposals')
  .delete()
  .is('pengusul_id', null);
if (deleteProposalError) {
  console.error('Gagal membersihkan usulan contoh:', deleteProposalError.message);
  process.exit(1);
}

const { error: proposalError } = await supabase
  .from('proposals')
  .insert(proposals.map((proposal) => ({ ...proposal, pengusul_id: null })));
if (proposalError) {
  console.error('Gagal seed proposals:', proposalError.message);
  process.exit(1);
}

console.log(
  `Seed selesai: ${categoryNames.length} kategori, ${apbdItems.length} apbd_items, ` +
    `${proposals.length} usulan contoh; ${skippedApbdWithoutAmount} baris APBD tanpa nominal dilewati.`,
);
