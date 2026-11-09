import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  RingkasanAiDialog,
  RingkasanAspirasiKartu,
} from '@/features/admin/components/RingkasanAiDialog';
import { GrafikTahap, StatistikRingkas } from '@/features/admin/components/StatistikAdmin';
import { umurHari } from '@/features/admin/components/umurHari';
import { useAdminStatsQuery } from '@/features/admin/queries';
import { useProposalsQuery } from '@/features/proposals/queries';
import { formatAngka, formatTanggal } from '@/lib/format';

/** Halaman pembuka admin: pekerjaan yang menunggu lebih dulu, angka dan laporan menyusul. */
export default function Ringkasan() {
  const proposalsQuery = useProposalsQuery();
  const statsQuery = useAdminStatsQuery(true);
  const proposals = proposalsQuery.data ?? [];
  const stats = statsQuery.data ?? null;
  const [ringkasanBuka, setRingkasanBuka] = useState(false);

  const menunggu = useMemo(
    () =>
      proposals
        .filter((proposal) => proposal.moderasi === 'Menunggu')
        .sort((a, b) => new Date(a.dibuat_pada).getTime() - new Date(b.dibuat_pada).getTime()),
    [proposals],
  );
  const terlama = menunggu[0];
  const hariTerlama = terlama ? umurHari(terlama.dibuat_pada) : 0;
  const terbaru = useMemo(
    () =>
      [...proposals]
        .sort((a, b) => new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime())
        .slice(0, 5),
    [proposals],
  );
  const sorotan = menunggu.length > 0 ? menunggu.slice(0, 5) : terbaru;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ringkasan"
        description="Gambaran singkat usulan warga, pekerjaan yang menunggu, dan tahap kemajuannya."
      />

      {proposalsQuery.isPending ? (
        <PageLoader label="Memuat ringkasan..." />
      ) : proposalsQuery.isError ? (
        <ErrorState
          message={proposalsQuery.error.message}
          onRetry={() => void proposalsQuery.refetch()}
        />
      ) : (
        <>
          {menunggu.length > 0 ? (
            <section
              aria-labelledby="judul-pekerjaan-menunggu"
              className="kartu-cap flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-mint-pucat p-5 sm:p-6"
            >
              <div className="min-w-0">
                <h2 id="judul-pekerjaan-menunggu" className="text-lg font-bold">
                  {formatAngka(menunggu.length)} usulan menunggu diperiksa
                </h2>
                <p className="mt-1 max-w-[65ch] text-sm text-ink/80">
                  {hariTerlama === 0
                    ? 'Usulan terlama baru masuk hari ini.'
                    : `Usulan terlama sudah menunggu ${hariTerlama} hari sejak ${formatTanggal(
                        terlama!.dibuat_pada,
                      )}.`}{' '}
                  Buka satu usulan, baca isinya, lalu putuskan.
                </p>
              </div>
              <Link to="/admin/perlu-diperiksa" className={buttonClass('primary', 'md')}>
                Periksa usulan
              </Link>
            </section>
          ) : (
            <section
              aria-labelledby="judul-pekerjaan-menunggu"
              className="kartu-cap rounded-3xl bg-surface p-5 sm:p-6"
            >
              <h2 id="judul-pekerjaan-menunggu" className="text-lg font-bold">
                Tidak ada usulan menunggu
              </h2>
              <p className="mt-1 max-w-[65ch] text-sm text-muted">
                Semua usulan sudah diputuskan. Kamu bisa memeriksa daftar lengkap atau membuka
                laporan aspirasi warga.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link to="/admin/usulan" className={buttonClass('outline', 'md')}>
                  Lihat semua usulan
                </Link>
                <Link to="/admin/laporan" className={buttonClass('ghost', 'md')}>
                  Buka laporan
                </Link>
              </div>
            </section>
          )}

          <StatistikRingkas stats={stats} proposals={proposals} memuat={statsQuery.isPending} />

          <RingkasanAspirasiKartu onBuka={() => setRingkasanBuka(true)} />
          <RingkasanAiDialog open={ringkasanBuka} onClose={() => setRingkasanBuka(false)} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">
                  {menunggu.length > 0 ? 'Perlu diperiksa' : 'Usulan terbaru'}
                </h2>
                <Link
                  to={menunggu.length > 0 ? '/admin/perlu-diperiksa' : '/admin/usulan'}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-warga hover:underline"
                >
                  Lihat semua
                </Link>
              </div>

              {sorotan.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Belum ada usulan.</p>
              ) : (
                <ul className="mt-2 divide-y divide-rule">
                  {sorotan.map((proposal) => {
                    const hari = umurHari(proposal.dibuat_pada);
                    return (
                      <li key={proposal.id} className="py-1 first:pt-0 last:pb-0">
                        <Link
                          to={`/admin/usulan/${proposal.id}`}
                          className="block min-h-11 rounded-xl px-2 py-2 hover:bg-active/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                        >
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <span className="min-w-0 font-semibold text-ink [overflow-wrap:anywhere]">
                              {proposal.judul}
                            </span>
                            <span className="flex-none text-[13px] text-muted">
                              {hari === 0 ? 'Hari ini' : `${hari} hari`}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[13px] text-muted [overflow-wrap:anywhere]">
                            {proposal.kategori} · oleh {proposal.pengusul_nama}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <GrafikTahap stats={stats} proposals={proposals} />
          </div>
        </>
      )}
    </div>
  );
}
