import { describeGap, type ApbdItem } from '@musrenbang/shared';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { LABEL_STATUS_DATA, rapikanSumber, statusData } from '@/features/apbd/lib';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { getCategoryInfo } from '@/features/categories/info';
import { formatPersen, formatRupiah } from '@/lib/format';
import { formatSelisih } from '@/lib/selisih';
import { formatBesarPanjang, setaraRupiah, type GapRingkasan, type GapRow } from '../lib';

type Props = {
  row: GapRow | null;
  onClose: () => void;
  ringkasan: GapRingkasan;
  /** Data sumber dan status verifikasi; boleh kosong bila belum termuat. */
  apbd: ApbdItem[];
};

/** Batang perbandingan satu sisi (warga atau APBD) pada skala yang sama. */
function Batang({
  label,
  nilai,
  warna,
  skala,
}: {
  label: string;
  nilai: number;
  warna: string;
  skala: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-muted">{label}</span>
        <b className="text-lg font-semibold tracking-[-0.01em]">{formatPersen(nilai)}</b>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-track">
        <i
          className={`bar-grow block h-full rounded-full ${warna}`}
          style={{ width: `${skala > 0 ? Math.min(100, (nilai / skala) * 100) : 0}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Pop-up rincian satu program di halaman Bandingkan: pilihan warga lawan porsi APBD,
 * kalimat penjelasan otomatis, nominal, dan sumber data beserta status verifikasinya.
 */
export function GapDetailDialog({ row, onClose, ringkasan, apbd }: Props) {
  const sumber = row ? apbd.find((item) => item.kategori === row.kategori) : undefined;
  const bisaBandingkan = Boolean(row && row.adaApbd && ringkasan.adaWarga);
  const skala = row ? Math.max(row.persen_warga, row.persen_apbd, 1) : 1;

  return (
    <Modal
      open={row !== null}
      onClose={onClose}
      labelledBy="gap-judul"
      className="w-[min(720px,calc(100vw-24px))]"
    >
      {row && (
        <div className="p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <CategoryTile kategori={row.kategori} />
              <div className="min-w-0">
                <h2 id="gap-judul" className="text-xl font-bold tracking-[-0.02em]">
                  {row.kategori}
                </h2>
                <p className="text-sm text-muted">{getCategoryInfo(row.kategori).deskripsi}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 flex-none items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.97]"
            >
              Tutup
            </button>
          </div>

          <div className="stagger mt-6 grid gap-4">
            <section className="rounded-3xl border border-border bg-surface p-5">
              {row.adaApbd ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Batang
                      label="Pilihan warga"
                      nilai={row.persen_warga}
                      warna="bg-warga"
                      skala={skala}
                    />
                    <Batang
                      label="Porsi APBD"
                      nilai={row.persen_apbd}
                      warna="bg-apbd"
                      skala={skala}
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule pt-4">
                    <span className="text-[13px] text-muted">Selisih</span>
                    {bisaBandingkan ? (
                      <b className="text-3xl font-semibold tracking-[-0.03em]">
                        {formatSelisih(row.gap_poin_persen)}
                        <small className="ml-1 text-base font-medium tracking-normal text-muted">
                          poin
                        </small>
                      </b>
                    ) : (
                      <b className="text-xl font-semibold text-muted">Belum ada</b>
                    )}
                  </div>
                  <p className="mt-2 max-w-[60ch] text-[14px] text-ink">
                    {bisaBandingkan
                      ? `${describeGap(row)} Setara kira-kira ${formatBesarPanjang(setaraRupiah(row, ringkasan.totalApbd))} dari APBD terpetakan.`
                      : 'Belum ada pilihan warga yang terkumpul, jadi belum ada selisih yang bisa dihitung. Yang tampil baru porsi APBD.'}
                  </p>
                </>
              ) : (
                <p className="text-[14px]">
                  Data APBD untuk program ini belum tersedia, jadi belum bisa dibandingkan dengan
                  pilihan warga. Angkanya tidak dikira-kira.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-surface p-5">
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
                <dt className="text-muted">Nominal APBD</dt>
                <dd className="font-semibold">
                  {row.adaApbd ? formatRupiah(row.nominal_apbd) : 'Data menyusul'}
                </dd>
                <dt className="text-muted">Status data</dt>
                <dd className="font-semibold">
                  {sumber
                    ? LABEL_STATUS_DATA[statusData(sumber)]
                    : row.adaApbd
                      ? 'Terverifikasi'
                      : 'Data belum ada'}
                </dd>
                <dt className="text-muted">Sumber</dt>
                <dd className="text-muted">
                  {rapikanSumber(sumber?.sumber) ?? 'Belum dicantumkan.'}
                </dd>
              </dl>
              <p className="mt-4 border-t border-rule pt-3 text-[12.5px] text-muted">
                Persentase APBD dihitung hanya dari kategori yang terverifikasi.{' '}
                <Link to="/metodologi" className="font-semibold text-warga underline">
                  Lihat metodologi
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}
