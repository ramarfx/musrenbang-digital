import type { PriorityRankingSummary } from '@musrenbang/shared';
import { Card } from '@/components/ui/Card';
import { formatAngka } from '@/lib/format';

type IsiProps = {
  baris: readonly PriorityRankingSummary[];
  memuat: boolean;
  galat: boolean;
};

/** Isi kartu tanpa pengambilan data, supaya mudah diuji. */
export function RankingWargaIsi({ baris, memuat, galat }: IsiProps) {
  const peserta = baris[0]?.jumlah_partisipan ?? 0;
  const tertinggi = Math.max(1, ...baris.map((item) => item.skor));

  return (
    <Card>
      <section aria-labelledby="judul-ranking-warga">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="judul-ranking-warga" className="text-lg font-bold">
            Urutan prioritas warga
          </h2>
          {peserta > 0 && (
            <p className="text-[13px] text-muted">{formatAngka(peserta)} warga ikut mengurutkan</p>
          )}
        </div>

        {memuat ? (
          <p className="mt-3 text-sm text-muted">Memuat...</p>
        ) : galat ? (
          <p className="mt-3 text-sm text-muted">
            Ranking belum bisa dimuat. Coba muat ulang halaman.
          </p>
        ) : baris.length === 0 ? (
          <p className="mt-3 max-w-[62ch] text-sm text-muted">
            Belum ada hasil. Ranking baru tampil setelah minimal dua warga mengurutkan, supaya
            pilihan satu orang tidak bisa dibaca dari hasil gabungannya.
          </p>
        ) : (
          <>
            <ol className="mt-3">
              {baris.map((item, index) => (
                <li
                  key={item.kategori}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-rule py-2.5 first:border-t-0 sm:grid-cols-[1.5rem_minmax(0,14rem)_minmax(0,1fr)_3rem]"
                >
                  <b className="text-muted tabular-nums">{index + 1}</b>
                  <span className="min-w-0 truncate font-semibold">{item.kategori}</span>
                  <span
                    aria-hidden="true"
                    className="order-last col-span-full h-2.5 rounded-full bg-track sm:order-none sm:col-span-1"
                  >
                    <i
                      className="block h-full rounded-full bg-warga"
                      style={{ width: `${(item.skor / tertinggi) * 100}%` }}
                    />
                  </span>
                  <span className="text-right text-[13px] text-muted tabular-nums">
                    {formatAngka(item.skor)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 max-w-[68ch] text-[13px] text-muted">
              Skor: nomor 1 mendapat 10 poin sampai nomor 10 mendapat 1 poin, dijumlah dari semua
              warga. Pakai untuk memilih mana yang didahulukan kalau selisih dua program di
              Bandingkan sama.
            </p>
          </>
        )}
      </section>
    </Card>
  );
}
