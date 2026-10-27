import { Link } from 'react-router-dom';
import { HeroCard } from '@/components/ui/Card';
import { buildRingSlices, DonutRing } from '@/components/ui/DonutRing';
import { Modal } from '@/components/ui/Modal';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { formatSelisih } from '../lib';

type Item = { kategori: string; jumlah: number };

type Props = {
  open: boolean;
  onClose: () => void;
  items: Item[];
  /** Nomor prioritas per program (1 = paling penting); program tanpa nomor tidak ada. */
  peringkat: Record<string, number>;
  jumlahProgram: number;
  /** Porsi APBD per kategori (persen), dari v_gap. Kosong bila belum tersedia. */
  apbdByKategori: Record<string, number>;
  bandingkanDenganApbd: boolean;
};

/**
 * Pop-up rincian urutan prioritas. Kiri: ring besar dengan legenda (setinggi tabel
 * di sebelahnya). Kanan: tabel semua program menurut nomornya, dengan bobot dan selisih APBD.
 * Pembungkus pop-up memakai komponen Modal.
 */
export function AllocationDetailDialog({
  open,
  onClose,
  items,
  peringkat,
  jumlahProgram,
  apbdByKategori,
  bandingkanDenganApbd,
}: Props) {
  const total = items.reduce((sum, item) => sum + item.jumlah, 0);
  const terisi = Object.keys(peringkat).length;
  // Menurut nomor; yang belum bernomor di bawah.
  const urut = [...items].sort(
    (a, b) =>
      (peringkat[a.kategori] ?? Infinity) - (peringkat[b.kategori] ?? Infinity) ||
      a.kategori.localeCompare(b.kategori),
  );
  const ring = buildRingSlices(items.map((item) => ({ label: item.kategori, value: item.jumlah })));
  const persenBobot = (nilai: number) => (total > 0 ? Math.round((nilai / total) * 100) : 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="rincian-judul"
      className="w-[min(1120px,calc(100vw-24px))]"
    >
      <div className="p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="rincian-judul" className="text-xl font-bold tracking-[-0.02em]">
              Rincian urutan prioritas
            </h2>
            <p className="mt-1 max-w-[52ch] text-sm text-muted">
              Semua program menurut nomornya, dengan bobot dari urutanmu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 flex-none items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.97]"
          >
            Tutup
          </button>
        </div>

        <div className="stagger mt-5 grid gap-6 md:grid-cols-[288px_minmax(0,1fr)]">
          <HeroCard className="md:flex md:flex-col">
            <DonutRing
              slices={ring}
              total={total}
              size="size-[220px]"
              drawIn
              label={
                ring.map((slice) => `${slice.label} ${persenBobot(slice.value)}%`).join(', ') ||
                'Belum ada urutan'
              }
            >
              <span className="block text-[13px] text-white/75">Diurutkan</span>
              <b className="block text-[21px] font-bold tracking-[-0.02em] whitespace-nowrap">
                {terisi} dari {jumlahProgram}
              </b>
              <em className="mt-0.5 block text-[13px] text-mint not-italic">
                {terisi === jumlahProgram ? 'Lengkap' : 'Belum lengkap'}
              </em>
            </DonutRing>

            <ul className="mt-6 flex flex-col gap-2.5 text-[13.5px]">
              {ring.map((slice) => (
                <li
                  key={slice.label}
                  className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5"
                >
                  <i className="size-3 rounded-[4px]" style={{ background: slice.color }} />
                  <span className="min-w-0 truncate">{slice.label}</span>
                  <b className="font-semibold">{persenBobot(slice.value)}%</b>
                </li>
              ))}
            </ul>

            <dl className="mt-5 text-[13px] md:mt-auto md:pt-5">
              <div className="flex justify-between gap-3 border-t border-white/15 pt-2.5">
                <dt className="text-white/70">Program diurutkan</dt>
                <dd className="font-bold">
                  {terisi} dari {jumlahProgram}
                </dd>
              </div>
            </dl>
          </HeroCard>

          <div className="overflow-hidden rounded-3xl border border-border bg-surface px-5 py-4 sm:px-6">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[12.5px] text-muted">
                  <th className="w-12 pb-2 font-normal">Nomor</th>
                  <th className="pb-2 pl-3 font-normal">Program</th>
                  <th className="hidden w-[140px] pb-2 pl-4 font-normal sm:table-cell">Bobot</th>
                  {bandingkanDenganApbd && (
                    <th className="hidden w-[104px] pb-2 pl-4 text-right font-normal lg:table-cell">
                      Selisih APBD
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="stagger">
                {urut.map((item) => {
                  const persen = persenBobot(item.jumlah);
                  const nomor = peringkat[item.kategori];
                  const kosong = item.jumlah === 0;
                  const selisih =
                    bandingkanDenganApbd && total > 0 && !kosong
                      ? (item.jumlah / total) * 100 - (apbdByKategori[item.kategori] ?? 0)
                      : null;
                  return (
                    <tr
                      key={item.kategori}
                      className={`border-t border-rule ${kosong ? 'text-muted' : ''}`}
                    >
                      <td className="py-2 text-[15px] font-bold tabular-nums">{nomor ?? ''}</td>
                      <td className="py-2 pl-3">
                        <span className="flex items-center gap-3">
                          <CategoryTile kategori={item.kategori} small />
                          <span className="min-w-0">
                            <span className="block font-semibold lg:whitespace-nowrap">
                              {item.kategori}
                            </span>
                            <span className="block text-[12.5px] text-muted sm:hidden">
                              {kosong ? 'Belum bernomor' : `${persen}% bobot`}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="hidden pl-4 sm:table-cell">
                        <span className="flex items-center gap-2.5">
                          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-track">
                            <i
                              className="bar-grow block h-full rounded-full bg-warga"
                              style={{ width: `${persen}%` }}
                            />
                          </span>
                          <span className="w-9 flex-none text-right text-[13px]">{persen}%</span>
                        </span>
                      </td>
                      {bandingkanDenganApbd && (
                        <td className="hidden pl-4 text-right text-[13.5px] whitespace-nowrap lg:table-cell">
                          {selisih === null ? (
                            <span className="text-muted">Belum ada</span>
                          ) : (
                            <>
                              {formatSelisih(selisih)} <span className="text-muted">poin</span>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {bandingkanDenganApbd && (
              <div className="mt-3 border-t border-rule pt-4 text-[13px] text-muted">
                <p className="font-semibold text-ink">Cara membaca kolom Selisih APBD</p>
                <p className="mt-1">
                  Angka ini membandingkan pilihanmu dengan porsi APBD yang sebenarnya, dalam poin
                  persentase.
                </p>
                <ul className="mt-2 grid gap-1.5">
                  <li>
                    <b className="text-ink">Plus (+)</b>: kamu memberi porsi lebih besar dari APBD.
                    Makin tinggi angkanya, makin kamu merasa program ini kurang diperhatikan.
                  </li>
                  <li>
                    <b className="text-ink">Minus (−)</b>: porsi APBD sudah lebih besar dari
                    pilihanmu. Makin dalam minusnya, makin besar APBD dibanding keinginanmu.
                  </li>
                  <li>
                    <b className="text-ink">Mendekati 0</b>: pilihanmu hampir sama dengan APBD.
                  </li>
                </ul>
                <p className="mt-2">
                  Contoh: +9,6 poin berarti pilihanmu 9,6 poin persentase di atas APBD.{' '}
                  <Link to="/metodologi" className="font-semibold text-warga underline">
                    Lihat metodologi
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
