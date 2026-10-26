import { infoKategori } from '../lib/kategori';
import { warnaStatus } from '../lib/status';

/** Badge status usulan. Tidak pernah terpotong atau terbungkus dua baris. */
export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex h-6 flex-none items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ${warnaStatus(status)}`}
    >
      {status}
    </span>
  );
}

/** Kotak kode dua huruf kategori, mis. "Pd" untuk Pendidikan. */
export function TileKategori({ kategori, kecil = false }: { kategori: string; kecil?: boolean }) {
  const { kode, nada } = infoKategori(kategori);
  const ukuran = kecil ? 'size-8 rounded-[10px] text-[11px]' : 'size-10 rounded-[13px] text-xs';
  const warna = nada === 'hijau' ? 'bg-[#d5ede3] text-[#0b4a36]' : 'bg-[#e9e3d8] text-ink';
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center font-bold ${ukuran} ${warna}`}
    >
      {kode}
    </span>
  );
}

/** Kategori lengkap: kotak kode + nama, dipakai di tabel dan daftar. */
export function NamaKategori({ kategori }: { kategori: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3 font-medium">
      <TileKategori kategori={kategori} kecil />
      <span className="min-w-0">{kategori}</span>
    </span>
  );
}
