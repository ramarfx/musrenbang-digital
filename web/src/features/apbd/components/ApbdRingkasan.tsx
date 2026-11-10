import { Link } from 'react-router-dom';
import { HeroCard } from '@/components/ui/Card';
import { formatBesarPanjang } from '@/lib/format';
import type { PorsiApbd } from '../lib';

/**
 * Kartu pembuka halaman APBD: satu angka besar yang menjawab "berapa besar" dan berapa bidang
 * yang sudah bisa dipakai. Angka yang belum terverifikasi tidak dijumlahkan diam-diam.
 */
export function ApbdRingkasan({
  porsi,
  kota,
  tahun,
}: {
  porsi: PorsiApbd;
  kota: string;
  tahun: number;
}) {
  const terverifikasi = porsi.rows.length;
  const jumlahBidang = terverifikasi + porsi.belum.length;

  return (
    <HeroCard className="stagger" isiClassName="max-w-[52ch]">
      <p className="text-[13px] text-white/75">
        APBD {kota} {tahun}
      </p>
      {porsi.total > 0 ? (
        <>
          <p className="mt-2 text-[13px] text-white/75">
            Belanja terverifikasi yang sudah dipetakan
          </p>
          <p className="mt-1 text-[28px] leading-tight font-bold tracking-[-0.02em] sm:text-[34px]">
            {formatBesarPanjang(porsi.total)}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/85">
            {terverifikasi} dari {jumlahBidang} bidang sudah terverifikasi dan ikut dibandingkan.
            {porsi.belum.length > 0 &&
              ` ${porsi.belum.length} bidang belum bisa dipakai karena angkanya belum ada atau belum terverifikasi.`}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[19px] leading-snug font-semibold">
          Belum ada angka APBD yang terverifikasi, jadi belum ada yang bisa dijumlahkan.
        </p>
      )}
      <p className="mt-4 border-t border-white/20 pt-3 text-[13px] leading-relaxed text-white/75">
        Ini belanja per urusan yang dipetakan ke bidang, bukan total belanja daerah.{' '}
        <Link to="/metodologi" className="font-semibold text-white underline">
          Cara memetakannya
        </Link>
        .
      </p>
    </HeroCard>
  );
}
