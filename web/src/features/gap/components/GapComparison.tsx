import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { cn } from '@/lib/cn';
import type { StatusKategori } from '@/features/apbd/lib';
import { formatPersen } from '@/lib/format';
import { formatSelisih } from '@/lib/selisih';
import { formatBesarSingkat, setaraRupiah, type GapRingkasan, type GapRow } from '../lib';

type Props = {
  ringkasan: GapRingkasan;
  onPilih: (row: GapRow) => void;
  /** Status data APBD per kategori dari halaman APBD; kosong bila belum termuat. */
  statusApbd?: Record<string, StatusKategori>;
};

/** Satu baris bar dua arah: garis tengah = porsi APBD, ke kanan = warga ingin lebih besar. */
function BarDuaArah({
  row,
  maks,
  index,
  aktif,
}: {
  row: GapRow;
  maks: number;
  index: number;
  aktif: boolean;
}) {
  const lebar = aktif ? (Math.abs(row.gap_poin_persen) / maks) * 50 : 0;
  const naik = row.gap_poin_persen >= 0;
  return (
    <div
      className="relative h-[22px] min-w-[200px]"
      role="img"
      aria-label={
        aktif
          ? `${row.kategori}: warga ${formatPersen(row.persen_warga)}, APBD ${formatPersen(row.persen_apbd)}, selisih ${formatSelisih(row.gap_poin_persen)} poin`
          : `${row.kategori}: belum bisa dibandingkan`
      }
    >
      <i className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 rounded-sm bg-apbd" />
      {lebar > 0 && (
        <i
          className={`bar-in absolute top-1 bottom-1 rounded-full ${
            naik ? 'origin-left bg-warga' : 'origin-right bg-apbd'
          }`}
          style={
            {
              ...(naik ? { left: 'calc(50% + 2px)' } : { right: 'calc(50% + 2px)' }),
              width: `${lebar}%`,
              ['--i' as string]: index,
            } as CSSProperties
          }
        />
      )}
    </div>
  );
}

/**
 * Kartu perbandingan: legenda dan tabel semua kategori. Tiap baris bisa diklik
 * untuk membuka rincian di pop-up. Kategori tanpa data APBD tampil "data menyusul"
 * dan tidak dibandingkan.
 */
export function GapComparison({ ringkasan, onPilih, statusApbd = {} }: Props) {
  // Kategori tanpa angka terverifikasi: bedakan "belum terverifikasi" dari "belum ada data".
  const keteranganApbd = (kategori: string) => {
    const status = statusApbd[kategori];
    if (status === 'belum_terverifikasi') return 'APBD belum terverifikasi';
    if (status === 'sebagian') return 'APBD sebagian terverifikasi';
    return 'Data APBD belum ada';
  };
  const { maks, adaWarga, totalApbd } = ringkasan;
  // Bawaan: urutan sama dengan simulator (PRD). Pilihan kedua: selisih terbesar dulu.
  const [urutan, setUrutan] = useState<'simulator' | 'selisih'>('simulator');
  const rows = urutan === 'simulator' ? ringkasan.rows : ringkasan.rowsSelisih;

  return (
    <Card className="overflow-x-auto">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Urutan program</p>
        <div
          role="group"
          aria-label="Urutan program"
          className="inline-flex rounded-xl border border-border bg-ground p-0.5"
        >
          {(
            [
              ['simulator', 'Sama dengan simulator'],
              ['selisih', 'Selisih terbesar'],
            ] as const
          ).map(([nilai, label]) => (
            <button
              key={nilai}
              type="button"
              aria-pressed={urutan === nilai}
              onClick={() => setUrutan(nilai)}
              className={cn(
                'h-8 rounded-[10px] px-3 text-[13px] font-semibold transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                urutan === nilai
                  ? 'bg-ink text-white'
                  : 'text-muted hover:bg-active hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-2">
          <i className="block h-3.5 w-[3px] rounded-sm bg-apbd" />
          Garis tengah = porsi APBD
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="block size-3 rounded-[4px] bg-warga" />
          Ke kanan: warga ingin lebih besar
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="block size-3 rounded-[4px] bg-apbd" />
          Ke kiri: warga ingin lebih kecil
        </span>
      </div>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Perbandingan persentase pilihan warga dan APBD per program. Pilih satu baris untuk melihat
          rinciannya.
        </caption>
        <thead>
          <tr className="border-b border-border text-[12.5px] text-muted">
            <th className="pr-3 pb-2.5 font-normal">Program</th>
            <th className="hidden pb-2.5 pl-2 font-normal lg:table-cell">
              Selisih warga dari APBD
            </th>
            <th className="hidden w-[72px] pb-2.5 pl-3 text-right font-normal md:table-cell">
              Warga
            </th>
            <th className="hidden w-[72px] pb-2.5 pl-3 text-right font-normal md:table-cell">
              APBD
            </th>
            <th className="pb-2.5 pl-3 text-right font-normal">Selisih</th>
          </tr>
        </thead>
        <tbody className="stagger">
          {rows.map((row, index) => {
            const aktif = adaWarga && row.adaApbd;
            const naik = row.gap_poin_persen >= 0;
            return (
              <tr
                key={row.kategori}
                className="relative border-b border-rule transition-colors duration-150 last:border-b-0 hover:bg-ground"
              >
                <td className="py-3.5 pr-3">
                  <span className="flex items-center gap-3">
                    <CategoryTile kategori={row.kategori} small />
                    <span className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onPilih(row)}
                        aria-haspopup="dialog"
                        className="text-left font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-warga"
                      >
                        {row.kategori}
                      </button>
                      <span className="block text-[12.5px] text-muted md:hidden">
                        {row.adaApbd
                          ? `Warga ${adaWarga ? formatPersen(row.persen_warga) : 'belum ada'} · APBD ${formatPersen(row.persen_apbd)}`
                          : keteranganApbd(row.kategori)}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="hidden pl-2 lg:table-cell">
                  {row.adaApbd ? (
                    <BarDuaArah row={row} maks={maks} index={index} aktif={aktif} />
                  ) : (
                    <span className="text-[13px] text-muted">{keteranganApbd(row.kategori)}</span>
                  )}
                </td>
                <td className="hidden pl-3 text-right md:table-cell">
                  {adaWarga ? (
                    formatPersen(row.persen_warga)
                  ) : (
                    <span className="text-[13px] text-muted">Belum ada</span>
                  )}
                </td>
                <td className="hidden pl-3 text-right md:table-cell">
                  {row.adaApbd ? (
                    formatPersen(row.persen_apbd)
                  ) : (
                    <span className="text-[13px] text-muted">Belum ada</span>
                  )}
                </td>
                <td className="pl-3 text-right md:whitespace-nowrap">
                  {aktif ? (
                    <span className="block font-semibold">
                      {formatSelisih(row.gap_poin_persen)} poin
                      <small className="block text-[12.5px] font-normal text-muted">
                        {naik ? 'warga ingin lebih besar' : 'warga ingin lebih kecil'}, ≈{' '}
                        {formatBesarSingkat(setaraRupiah(row, totalApbd))}
                      </small>
                    </span>
                  ) : (
                    <span className="text-[13px] text-muted">
                      {row.adaApbd ? 'Menunggu pilihan warga' : 'Belum bisa dibandingkan'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-4 rounded-xl bg-ground px-3 py-2.5 text-[13px] text-muted">
        Angka APBD adalah hasil pemetaan dari pos APBD resmi, bukan total belanja daerah. Selisih
        dihitung dari persentase warga dikurangi persentase APBD, dalam poin persentase.{' '}
        <Link to="/metodologi" className="font-semibold text-warga underline">
          Lihat metodologi
        </Link>{' '}
        atau{' '}
        <Link to="/apbd" className="font-semibold text-warga underline">
          sumber tiap kategori
        </Link>
        .
      </p>
    </Card>
  );
}
