import apbdCsv from '../../../db/seeds/apbd-jakarta-2026.csv?raw';
import usulanJson from '../../../db/seeds/proposals-contoh.json';
import type { ApbdItem, GapItem, Proposal } from './supabase';

/**
 * Data mode contoh, dibaca langsung dari berkas seed tim backend (tanpa diubah).
 * Tidak ada angka karangan: alokasi warga kosong, suara nol, komentar kosong.
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

const baris = parseCsv(apbdCsv);
const kolom = (nama: string) => baris[0].indexOf(nama);

export const apbdContoh: ApbdItem[] = baris
  .slice(1)
  .filter((r) => r.length > 1 && r[kolom('kategori')])
  .map((r, i) => ({
    id: i + 1,
    kategori: r[kolom('kategori')],
    nominal_rp: Number(r[kolom('nominal_rp')]?.trim() || 0),
    tahun: Number(r[kolom('tahun')]),
    kota: r[kolom('kota')],
    sumber: r[kolom('sumber')] ?? '',
    status_verifikasi: r[kolom('status_verifikasi')] || 'perlu_lampiran',
  }));

export const kategoriContoh: string[] = apbdContoh.map((a) => a.kategori);

export const configContoh: Record<string, string> = {
  kota: apbdContoh[0]?.kota ?? 'DKI Jakarta',
  tahun_anggaran: String(apbdContoh[0]?.tahun ?? 2026),
  virtual_budget_per_warga: '10000000',
};

// Seed usulan tidak punya tanggal; tanggal seed dibuat (26 Okt 2026) dipakai untuk semua.
export const usulanContoh: Proposal[] = (usulanJson as Omit<Proposal, 'id'>[]).map((u, i) => ({
  id: i + 1,
  judul: u.judul,
  deskripsi: u.deskripsi,
  kategori: u.kategori,
  lokasi: u.lokasi ?? null,
  latitude: u.latitude ?? null,
  longitude: u.longitude ?? null,
  estimasi_biaya: u.estimasi_biaya,
  pengusul_id: null,
  status: u.status,
  dibuat_pada: '2026-10-26T00:00:00+07:00',
}));

/** Meniru view v_gap tanpa alokasi warga: persen warga nol, gap = minus persen APBD. */
export function gapContoh(): GapItem[] {
  const total = apbdContoh.reduce((s, a) => s + a.nominal_rp, 0);
  return apbdContoh.map((a) => {
    const persenApbd = total > 0 ? Math.round((a.nominal_rp * 10000) / total) / 100 : 0;
    return {
      kategori: a.kategori,
      persen_warga: 0,
      persen_apbd: persenApbd,
      gap_poin_persen: -persenApbd,
      nominal_apbd: a.nominal_rp,
      total_alokasi_warga: 0,
    };
  });
}
