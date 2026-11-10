import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card, HeroCard } from '@/components/ui/Card';
import { formatBesarPanjang, formatPersen } from '@/lib/format';
import { formatSelisih } from '@/lib/selisih';
import { WARNA_ARAH, arahSelisih, setaraRupiah, type GapRingkasan, type GapRow } from '../lib';

/** Angka yang disorot dengan stabilo: hijau untuk sisi warga, oranye untuk sisi APBD. */
function Stabilo({ warna, children }: { warna: string; children: string }) {
  return (
    <span
      className="rounded-[3px] px-1.5 py-px text-hitam [box-decoration-break:clone]"
      style={{ backgroundColor: warna }}
    >
      {children}
    </span>
  );
}

/** Kalimat temuan terbesar, disusun mulai dari sisi yang lebih besar supaya mudah dibaca. */
function KalimatTemuan({ row }: { row: GapRow }) {
  const warga = <Stabilo warna={WARNA_ARAH.tambah}>{formatPersen(row.persen_warga)}</Stabilo>;
  const apbd = <Stabilo warna={WARNA_ARAH.kurang}>{formatPersen(row.persen_apbd)}</Stabilo>;
  return row.gap_poin_persen >= 0 ? (
    <>
      Warga ingin {warga} untuk {row.kategori}, padahal APBD baru memberi {apbd}.
    </>
  ) : (
    <>
      APBD memberi {apbd} untuk {row.kategori}, padahal{' '}
      {row.persen_warga < 0.5 ? (
        'belum ada warga yang memilihnya.'
      ) : (
        <>warga hanya ingin {warga}.</>
      )}
    </>
  );
}

/**
 * Kartu temuan di atas halaman Bandingkan: satu kalimat besar untuk program yang paling jauh
 * dari pilihan warga, lalu dua temuan berikutnya. Bila belum ada pilihan warga atau data APBD
 * terverifikasi, kartu hijau mengatakannya dengan jujur dan tidak menampilkan angka.
 */
export function GapLead({ ringkasan }: { ringkasan: GapRingkasan }) {
  const {
    sorotan,
    teratas,
    adaWarga,
    totalApbd,
    statusVerifikasiServer,
    jumlahApbdTerverifikasi,
    jumlahPartisipan,
  } = ringkasan;
  const tanpaApbd = statusVerifikasiServer !== 'terverifikasi' || jumlahApbdTerverifikasi === 0;

  if (!sorotan) {
    return (
      <HeroCard className="stagger">
        <p className="text-[13px] text-white/75">Di program mana warga paling berbeda dari APBD?</p>
        <p className="mt-3 max-w-[48ch] text-xl leading-snug font-semibold tracking-[-0.01em]">
          {adaWarga
            ? tanpaApbd
              ? statusVerifikasiServer === 'tidak_diketahui'
                ? 'Selisih dengan APBD belum bisa ditampilkan karena status verifikasi data APBD belum tersedia dari server.'
                : 'Selisih dengan APBD belum bisa dihitung karena belum ada data APBD terverifikasi.'
              : 'Belum ada program dengan data APBD yang bisa dibandingkan.'
            : 'Belum ada pilihan warga yang terkumpul. Yang tampil baru sisi APBD.'}
        </p>
        <Link
          to="/simulator"
          className={`${buttonClass('outline', 'md', 'mt-5 border-transparent')} w-fit`}
        >
          Isi simulatormu
        </Link>
      </HeroCard>
    );
  }

  const lainnya = teratas.slice(1);
  return (
    <Card className="stagger">
      <p className="text-[13px] text-muted">Paling jauh dari pilihan warga</p>
      <p className="mt-1.5 max-w-[36ch] text-2xl leading-snug font-bold tracking-[-0.01em] sm:text-[28px]">
        <KalimatTemuan row={sorotan} />
      </p>
      <p className="mt-3 max-w-[60ch] text-[13px] text-muted">
        Selisih {formatSelisih(sorotan.gap_poin_persen).replace(/^[+−]/, '')} poin, setara kira-kira{' '}
        {formatBesarPanjang(setaraRupiah(sorotan, totalApbd))} dari APBD terpetakan{' '}
        {formatBesarPanjang(totalApbd)}.
        {sorotan.gap_poin_persen < 0 &&
          ' Bidang yang tidak dipilih warga dihitung 0%. Itu artinya belum jadi prioritas, bukan berarti anggarannya harus dikurangi.'}
      </p>
      {lainnya.length > 0 && (
        <ol className="mt-5 border-t border-rule">
          {lainnya.map((row, index) => {
            const arah = arahSelisih(row.gap_poin_persen);
            return (
              <li
                key={row.kategori}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-3 last:border-b-0 last:pb-0"
              >
                <b className="w-4 flex-none text-muted tabular-nums">{index + 2}</b>
                <span className="font-semibold">{row.kategori}</span>
                <span className="tanda-status" style={{ '--tanda': arah.warna } as CSSProperties}>
                  {arah.label}
                </span>
                <span className="text-[13px] text-muted sm:ml-auto">
                  warga {formatPersen(row.persen_warga)}, APBD {formatPersen(row.persen_apbd)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {jumlahPartisipan !== undefined && jumlahPartisipan > 0 && (
        <div className="mt-4 flex items-center gap-3 border-t border-rule pt-3.5">
          <span className="grid h-8 min-w-8 flex-none place-items-center rounded-[9px] border-[1.5px] border-edge bg-hijau-terang px-1.5 text-[15px] font-bold text-hitam tabular-nums">
            {jumlahPartisipan}
          </span>
          <p className="text-[13px] text-muted">
            warga menjadi dasar angka ini.{' '}
            <Link to="/simulator" className="font-semibold text-warga underline">
              Isi punyamu
            </Link>
            .
          </p>
        </div>
      )}
    </Card>
  );
}
