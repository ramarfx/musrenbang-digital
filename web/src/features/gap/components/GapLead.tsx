import { describeGap } from '@musrenbang/shared';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card, HeroCard } from '@/components/ui/Card';
import { formatSelisih } from '@/lib/selisih';
import { formatBesarPanjang, setaraRupiah, type GapRingkasan } from '../lib';

/**
 * Dua kartu temuan di atas halaman Bandingkan: pertanyaannya (kartu hijau) dan
 * angka selisih terbesar. Bila belum ada pilihan warga, keduanya jujur mengatakannya
 * dan tidak menampilkan angka.
 */
export function GapLead({ ringkasan }: { ringkasan: GapRingkasan }) {
  const { sorotan, adaWarga, totalApbd } = ringkasan;

  return (
    <div className="stagger grid gap-6 lg:grid-cols-2">
      <HeroCard>
        <p className="text-[13px] text-white/75">Di program mana warga paling berbeda dari APBD?</p>
        {sorotan ? (
          <p className="mt-3 max-w-[48ch] text-xl leading-snug font-semibold tracking-[-0.01em]">
            {describeGap(sorotan)}
          </p>
        ) : (
          <>
            <p className="mt-3 max-w-[48ch] text-xl leading-snug font-semibold tracking-[-0.01em]">
              {adaWarga
                ? 'Belum ada program dengan data APBD yang bisa dibandingkan.'
                : 'Belum ada pilihan warga yang terkumpul. Yang tampil baru sisi APBD.'}
            </p>
            <Link
              to="/simulator"
              className={`${buttonClass('outline', 'md', 'mt-5 border-transparent')} w-fit`}
            >
              Isi simulator anggaran
            </Link>
          </>
        )}
      </HeroCard>

      <Card className="flex flex-col justify-center">
        <p className="text-[13px] text-muted">Selisih terbesar</p>
        {sorotan ? (
          <>
            <p
              className={`mt-1 text-[56px] leading-none font-semibold tracking-[-0.04em] ${
                sorotan.gap_poin_persen >= 0 ? 'text-warga' : 'text-ink'
              }`}
            >
              {formatSelisih(sorotan.gap_poin_persen)}
              <small className="ml-1.5 text-lg font-medium tracking-normal text-muted">poin</small>
            </p>
            <p className="mt-3 text-[13px] text-muted">
              {sorotan.kategori}. Setara kira-kira{' '}
              {formatBesarPanjang(setaraRupiah(sorotan, totalApbd))} dari APBD terpetakan{' '}
              {formatBesarPanjang(totalApbd)}.
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-[56px] leading-none font-semibold tracking-[-0.04em] text-muted">
              &mdash;
            </p>
            <p className="mt-3 text-[13px] text-muted">
              Angka muncul setelah ada warga yang menyimpan pilihannya di simulator.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
