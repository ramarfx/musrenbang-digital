/**
 * Cek kesiapan sebelum demo. Hanya membaca dengan kunci anon yang memang publik, tanpa login,
 * tanpa memanggil Gemini, dan tanpa menulis apa pun.
 *
 * Pakai: bun run predemo
 * Keluar dengan kode 1 bila ada pemeriksaan yang gagal.
 */
const SITE = process.env.SITE_URL ?? 'https://musrenbang-digital.pages.dev';
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
if (!url.startsWith('https://') || anonKey.length < 20) {
  console.error('URL Supabase atau kunci anon belum tersedia. Jalankan lewat `bun run predemo`.');
  process.exit(1);
}

// Batas minimal agar demo terlihat hidup; sesuaikan bila data demo berubah.
const MIN_APPROVED_PROPOSALS = 20;
const MIN_GAP_PARTICIPANTS = 10;
const MIN_APBD_ROWS = 10;
const MAX_READ_MS = 2000;
const FUNCTIONS = ['admin-ai-triage', 'musrenai-chat', 'musrenai-cost-hint'];

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];
const record = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
async function rest<T>(path: string): Promise<{ data: T | null; ms: number; status: number }> {
  const started = performance.now();
  try {
    const response = await fetch(url + path, { headers, signal: AbortSignal.timeout(15000) });
    const data = response.ok ? ((await response.json()) as T) : null;
    return { data, ms: performance.now() - started, status: response.status };
  } catch {
    return { data: null, ms: performance.now() - started, status: 0 };
  }
}

// 1. Aplikasi dan proyek Supabase aktif (proyek gratis bisa terjeda bila lama tidak dipakai).
try {
  const site = await fetch(SITE, { signal: AbortSignal.timeout(15000) });
  record('Situs terbuka', site.ok, `${SITE} -> ${site.status}`);
} catch {
  record('Situs terbuka', false, `${SITE} tidak dapat dijangkau`);
}
const config = await rest<{ kunci: string; nilai: string }[]>('/rest/v1/config?select=kunci,nilai');
record(
  'Database aktif',
  config.status === 200 && config.ms <= MAX_READ_MS,
  config.status === 200
    ? `${config.ms.toFixed(0)} ms`
    : `status ${config.status}; periksa dashboard apakah proyek terjeda`,
);
const settings = new Map((config.data ?? []).map((row) => [row.kunci, row.nilai]));
const year = settings.get('tahun_anggaran') ?? '';
record(
  'Konfigurasi kota dan tahun',
  Boolean(settings.get('kota') && year),
  `${settings.get('kota')} ${year}`,
);

// 2. Data APBD terverifikasi untuk tahun yang dipakai Gap.
const apbd = await rest<{ tahun: number; status_verifikasi: string; sumber_url: string | null }[]>(
  '/rest/v1/apbd_items?select=tahun,status_verifikasi,sumber_url',
);
const rows = (apbd.data ?? []).filter((row) => String(row.tahun) === year);
const verified = rows.filter(
  (row) => row.status_verifikasi === 'verified_program' && row.sumber_url,
);
record(
  'APBD terverifikasi',
  verified.length >= MIN_APBD_ROWS,
  `${verified.length} baris bersumber untuk tahun ${year} (minimal ${MIN_APBD_ROWS})`,
);

// 3. Gap dan usulan publik terisi.
const gap = await rest<{ apbd_tersedia: boolean; jumlah_partisipan: number }[]>(
  '/rest/v1/v_gap?select=apbd_tersedia,jumlah_partisipan&limit=1',
);
const g = gap.data?.[0];
record(
  'Gap warga vs APBD',
  Boolean(g?.apbd_tersedia) && (g?.jumlah_partisipan ?? 0) >= MIN_GAP_PARTICIPANTS,
  `apbd_tersedia=${g?.apbd_tersedia}, partisipan=${g?.jumlah_partisipan} (minimal ${MIN_GAP_PARTICIPANTS})`,
);
const proposals = await rest<{ id: number }[]>('/rest/v1/v_proposals?select=id&limit=500');
record(
  'Usulan publik',
  (proposals.data?.length ?? 0) >= MIN_APPROVED_PROPOSALS,
  `${proposals.data?.length ?? 0} usulan terlihat publik (minimal ${MIN_APPROVED_PROPOSALS})`,
);

// 4. Edge Function: bisa boot dan wajib login. Tidak ada panggilan ke Gemini.
for (const name of FUNCTIONS) {
  const endpoint = `${url}/functions/v1/${name}`;
  try {
    const preflight = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: { Origin: SITE, 'Access-Control-Request-Method': 'POST' },
      signal: AbortSignal.timeout(15000),
    });
    const anonymous = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: SITE },
      body: '{}',
      signal: AbortSignal.timeout(15000),
    });
    record(
      `Fungsi ${name}`,
      preflight.status === 204 && anonymous.status === 401,
      `OPTIONS ${preflight.status} (harus 204), tanpa login ${anonymous.status} (harus 401)`,
    );
  } catch {
    record(`Fungsi ${name}`, false, 'tidak dapat dijangkau');
  }
}

let failed = 0;
for (const check of checks) {
  if (!check.ok) failed += 1;
  console.log(`${check.ok ? 'OK    ' : 'GAGAL '} ${check.name.padEnd(28)} ${check.detail}`);
}
console.log(
  failed === 0
    ? '\nSiap demo. Kuota Gemini harian tidak bisa dibaca dari sini; cek log fungsi bila ragu.'
    : `\n${failed} pemeriksaan gagal. Perbaiki sebelum demo.`,
);
process.exit(failed === 0 ? 0 : 1);

export {};
