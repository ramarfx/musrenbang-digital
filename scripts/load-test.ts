/**
 * Uji beban ringan untuk endpoint baca publik (hanya GET, kunci anon, tanpa login).
 * Mengukur waktu respons dan tingkat galat saat banyak pengunjung membuka aplikasi bersamaan.
 *
 * Pakai: bun --env-file=web/.env.local scripts/load-test.ts --requests 200 --concurrency 20
 * Membaca VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY (atau SUPABASE_URL dan SUPABASE_ANON_KEY).
 * Batas atas dijaga agar skrip ini tidak berubah menjadi serangan terhadap project sendiri.
 */
const MAX_REQUESTS = 1000;
const MAX_CONCURRENCY = 50;

function arg(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`--${name} harus bilangan bulat positif`);
  return value;
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
if (!url.startsWith('https://') || anonKey.length < 20) {
  console.error(
    'URL Supabase atau kunci anon belum tersedia. Jalankan dengan --env-file=web/.env.local.',
  );
  process.exit(1);
}
const totalRequests = Math.min(arg('requests', 200), MAX_REQUESTS);
const concurrency = Math.min(arg('concurrency', 20), MAX_CONCURRENCY);

// Endpoint yang dibuka pengunjung di beranda, halaman APBD, dan perbandingan Gap.
const endpoints = [
  { name: 'daftar usulan', path: '/rest/v1/v_proposals?select=*&order=dibuat_pada.desc&limit=50' },
  { name: 'gap warga vs apbd', path: '/rest/v1/v_gap?select=*' },
  { name: 'data apbd', path: '/rest/v1/apbd_items?select=kategori,nominal_rp,tahun,sumber_url' },
  { name: 'statistik publik', path: '/rest/v1/v_public_stats?select=*' },
];

type Result = { endpoint: string; ms: number; ok: boolean; status: number };
const results: Result[] = [];
let next = 0;

async function worker() {
  while (next < totalRequests) {
    const endpoint = endpoints[next % endpoints.length];
    next += 1;
    const started = performance.now();
    let status = 0;
    try {
      const response = await fetch(url + endpoint.path, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(15000),
      });
      status = response.status;
      await response.arrayBuffer();
    } catch {
      status = 0;
    }
    results.push({
      endpoint: endpoint.name,
      ms: performance.now() - started,
      ok: status >= 200 && status < 300,
      status,
    });
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function summarize(label: string, rows: Result[]) {
  const times = rows.map((row) => row.ms).sort((a, b) => a - b);
  const failed = rows.filter((row) => !row.ok);
  const codes = [...new Set(failed.map((row) => row.status))].join(',') || '-';
  console.log(
    `${label.padEnd(18)} n=${String(rows.length).padStart(4)}  p50=${percentile(times, 50).toFixed(0).padStart(4)} ms  ` +
      `p95=${percentile(times, 95).toFixed(0).padStart(4)} ms  maks=${(times.at(-1) ?? 0).toFixed(0).padStart(5)} ms  ` +
      `galat=${failed.length} (${codes})`,
  );
}

const started = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const seconds = (performance.now() - started) / 1000;

console.log(
  `Uji beban: ${totalRequests} permintaan, ${concurrency} bersamaan, ${seconds.toFixed(1)} detik`,
);
for (const endpoint of endpoints) {
  summarize(
    endpoint.name,
    results.filter((row) => row.endpoint === endpoint.name),
  );
}
summarize('TOTAL', results);
console.log(`Throughput: ${(totalRequests / seconds).toFixed(1)} permintaan per detik`);

export {};
