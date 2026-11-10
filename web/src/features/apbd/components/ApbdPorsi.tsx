import type { CSSProperties } from 'react';
import { Card } from '@/components/ui/Card';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { formatBesarPanjang, formatPersen } from '@/lib/format';
import type { PorsiApbd } from '../lib';

/**
 * Porsi tiap bidang dari APBD terverifikasi. Satu warna untuk panjang batang, warna kategori
 * hanya sebagai ikon, supaya "panjang berarti uang" tetap terbaca tanpa kanvas warna-warni.
 * Batang memakai skala 0 sampai 100 persen, jadi setengah batang memang separuh anggaran.
 */
export function ApbdPorsi({ porsi }: { porsi: PorsiApbd }) {
  if (porsi.rows.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-bold tracking-[-0.01em]">Porsi tiap bidang</h2>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
          Belum ada angka APBD yang terverifikasi, jadi porsinya belum bisa dihitung.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-bold tracking-[-0.01em]">Porsi tiap bidang</h2>
      <p className="mt-1 max-w-[62ch] text-[14px] text-muted">
        Dari {formatBesarPanjang(porsi.total)} APBD terverifikasi. Satu batang penuh berarti 100%
        dari jumlah itu.
      </p>

      <ul className="mt-4">
        {porsi.rows.map((row, index) => (
          <li
            key={row.kategori}
            className="border-b border-rule py-3.5 first:pt-0 last:border-b-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <CategoryTile kategori={row.kategori} small />
                <span className="min-w-0 text-[15px] leading-snug font-semibold">
                  {row.kategori}
                </span>
              </span>
              <b className="flex-none text-[15px] font-semibold tabular-nums">
                {formatPersen(row.persen)}
              </b>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-[4px] bg-track" aria-hidden="true">
              <i
                className="bar-in block h-full rounded-[4px] bg-apbd"
                style={{ width: `${row.persen}%`, ['--i' as string]: index } as CSSProperties}
              />
            </div>
            <p className="mt-1 text-[13.5px] text-muted">{formatBesarPanjang(row.nominal)}</p>
          </li>
        ))}
      </ul>

      {porsi.belum.length > 0 && (
        <p className="mt-4 border-t border-rule pt-3 text-[13.5px] leading-relaxed text-muted">
          {porsi.belum.length} bidang belum masuk hitungan karena angkanya belum ada atau belum
          terverifikasi: {porsi.belum.join(', ')}. Rinciannya ada di daftar angka dan sumber di
          bawah.
        </p>
      )}
    </Card>
  );
}
