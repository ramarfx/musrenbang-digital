import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { cn } from '@/lib/cn';
import type { StatusKategori } from '@/features/apbd/lib';
import { formatBesarSingkat, formatPersen } from '@/lib/format';
import { formatSelisih } from '@/lib/selisih';
import { arahSelisih, setaraRupiah, type GapRingkasan, type GapRow } from '../lib';

type Props = {
  ringkasan: GapRingkasan;
  onPilih: (row: GapRow) => void;
  /** Status data APBD per kategori dari halaman APBD; kosong bila belum termuat. */
  statusApbd?: Record<string, StatusKategori>;
};

/** Satu batang persentase: hijau untuk warga, tinta untuk APBD. Panjangnya relatif ke batang terpanjang. */
function BatangPersen({
  label,
  persen,
  skala,
  index,
  warna,
}: {
  label: string;
  persen: number;
  skala: number;
  index: number;
  warna: string;
}) {
  return (
    <div className="flex items-center gap-3 text-[14px]">
      <span className="w-11 flex-none text-muted">{label}</span>
      <div className="relative h-2.5 min-w-0 flex-1 rounded-full bg-track" aria-hidden="true">
        <i
          className={cn('bar-in absolute inset-y-0 left-0 origin-left rounded-full', warna)}
          style={{ width: `${(persen / skala) * 100}%`, ['--i' as string]: index } as CSSProperties}
        />
      </div>
      <b className="w-14 flex-none text-right font-semibold tabular-nums">{formatPersen(persen)}</b>
    </div>
  );
}

/**
 * Kartu perbandingan: daftar semua kategori, tiap kategori dengan dua batang (warga dan APBD)
 * dan label arahnya. Tiap baris bisa diklik untuk membuka rincian di pop-up. Kategori tanpa
 * data APBD tampil keterangannya dan tidak dibandingkan.
 */
export function GapComparison({ ringkasan, onPilih, statusApbd = {} }: Props) {
  // Kategori tanpa angka terverifikasi: bedakan "belum terverifikasi" dari "belum ada data".
  const keteranganApbd = (kategori: string) => {
    const status = statusApbd[kategori];
    if (status === 'belum_terverifikasi') return 'APBD belum terverifikasi';
    if (status === 'sebagian') return 'APBD sebagian terverifikasi';
    return 'Data APBD belum ada';
  };
  const { adaWarga, totalApbd } = ringkasan;
  // Bawaan: urutan sama dengan simulator (PRD). Pilihan kedua: selisih terbesar dulu.
  const [urutan, setUrutan] = useState<'simulator' | 'selisih'>('simulator');
  const rows = urutan === 'simulator' ? ringkasan.rows : ringkasan.rowsSelisih;
  // Satu skala untuk semua baris, supaya panjang batang antarprogram bisa dibandingkan.
  const skala = Math.max(
    1,
    ...rows.flatMap((row) => (row.adaApbd ? [row.persen_apbd, row.persen_warga] : [])),
  );

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
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
                  ? 'bg-ink text-on-ink'
                  : 'text-muted hover:bg-active hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-rule pt-3 text-[13.5px] text-muted">
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-warga" aria-hidden="true" /> Warga
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-apbd" aria-hidden="true" /> APBD
          </span>
        </span>
        <span>Skala batang: penuh = {formatPersen(skala)}</span>
      </div>

      <ul className="stagger">
        {rows.map((row, index) => {
          const aktif = adaWarga && row.adaApbd;
          const arah = arahSelisih(row.gap_poin_persen);
          const naik = row.gap_poin_persen >= 0;
          return (
            <li
              key={row.kategori}
              className="relative border-b border-rule py-4 transition-colors duration-150 last:border-b-0 hover:bg-ground"
            >
              <div className="flex items-center gap-3">
                <CategoryTile kategori={row.kategori} small />
                <button
                  type="button"
                  onClick={() => onPilih(row)}
                  aria-haspopup="dialog"
                  aria-label={
                    aktif
                      ? `${row.kategori}: warga ${formatPersen(row.persen_warga)}, APBD ${formatPersen(row.persen_apbd)}, selisih ${formatSelisih(row.gap_poin_persen)} poin`
                      : `${row.kategori}: ${row.adaApbd ? 'menunggu pilihan warga' : 'belum bisa dibandingkan'}`
                  }
                  className="min-w-0 flex-1 text-left font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-warga"
                >
                  {row.kategori}
                </button>
                {aktif && (
                  <span
                    className="tanda-status flex-none"
                    style={{ '--tanda': arah.warna } as CSSProperties}
                  >
                    {arah.label}
                  </span>
                )}
              </div>

              <div className="mt-2.5 space-y-1.5 pl-[3.25rem]">
                {row.adaApbd ? (
                  <>
                    {adaWarga ? (
                      <BatangPersen
                        label="Warga"
                        persen={row.persen_warga}
                        skala={skala}
                        index={index}
                        warna="bg-warga"
                      />
                    ) : (
                      <p className="text-[14px] text-muted">Warga: belum ada pilihan.</p>
                    )}
                    <BatangPersen
                      label="APBD"
                      persen={row.persen_apbd}
                      skala={skala}
                      index={index}
                      warna="bg-apbd"
                    />
                    {statusApbd[row.kategori] === 'sebagian' && (
                      <p className="text-[13.5px] text-muted">
                        APBD sebagian terverifikasi; angka hanya mencakup data terverifikasi.
                      </p>
                    )}
                    {aktif && (
                      <p className="pt-0.5 text-[13.5px] text-muted">
                        <b className="font-semibold text-ink">
                          {formatSelisih(row.gap_poin_persen)} poin
                        </b>
                        , {naik ? 'warga ingin lebih besar' : 'warga ingin lebih kecil'}, ≈{' '}
                        {formatBesarSingkat(setaraRupiah(row, totalApbd))}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[14px] text-muted">{keteranganApbd(row.kategori)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 max-w-[68ch] text-[14px] leading-relaxed text-muted">
        Angka APBD dipetakan dari belanja per urusan, bukan total belanja daerah. Selisih adalah
        persen warga dikurangi persen APBD, dalam poin: selisih 12 poin artinya 12 dari setiap 100
        rupiah. Cara hitungnya ada di{' '}
        <Link to="/metodologi" className="font-semibold text-warga underline">
          Metodologi
        </Link>
        , asal tiap angka di{' '}
        <Link to="/apbd" className="font-semibold text-warga underline">
          halaman APBD
        </Link>
        .
      </p>
    </Card>
  );
}
