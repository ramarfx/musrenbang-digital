import { buttonClass } from '@/components/ui/Button';
import type { ProposalStatus } from '@musrenbang/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProposalMap } from '@/components/map/ProposalMap';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProposalCard } from '@/features/proposals/components/ProposalCard';
import { ProposalFilters } from '@/features/proposals/components/ProposalFilters';
import { useProposalsQuery } from '@/features/proposals/queries';
import { formatAngka, formatRupiahRingkas } from '@/lib/format';

export default function Beranda() {
  const proposalsQuery = useProposalsQuery();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProposalStatus | 'semua'>('semua');

  const proposals = proposalsQuery.data ?? [];
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return proposals.filter((proposal) => {
      const cocokStatus = status === 'semua' || proposal.status === status;
      const cocokKeyword =
        keyword.length === 0 ||
        proposal.judul.toLowerCase().includes(keyword) ||
        proposal.deskripsi.toLowerCase().includes(keyword) ||
        proposal.kategori.toLowerCase().includes(keyword) ||
        proposal.pengusul_nama.toLowerCase().includes(keyword);
      return cocokStatus && cocokKeyword;
    });
  }, [proposals, search, status]);

  const totalSuara = proposals.reduce((sum, proposal) => sum + proposal.jumlah_suara, 0);
  const totalEstimasi = proposals.reduce((sum, proposal) => sum + proposal.estimasi_biaya, 0);
  const jumlahBerlokasi = filtered.filter(
    (proposal) => proposal.latitude !== null && proposal.longitude !== null,
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Anggaran kota, diputuskan bersama."
        description="Usulkan program, alokasikan anggaran virtual, beri suara, dan bandingkan prioritas warga dengan APBD yang sebenarnya."
        actions={
          <>
            <Link to="/simulator" className={buttonClass('primary')}>
              Coba Simulator Anggaran
            </Link>
            <Link to="/bandingkan" className={buttonClass('outline')}>
              Lihat Gap Warga-APBD
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan partisipasi">
        <Card>
          <p className="text-sm text-stone-500">Usulan warga</p>
          <p className="text-2xl font-bold tabular-nums">{formatAngka(proposals.length)}</p>
        </Card>
        <Card>
          <p className="text-sm text-stone-500">Suara terkumpul</p>
          <p className="text-2xl font-bold tabular-nums">{formatAngka(totalSuara)}</p>
        </Card>
        <Card>
          <p className="text-sm text-stone-500">Total estimasi usulan</p>
          <p className="text-2xl font-bold tabular-nums">{formatRupiahRingkas(totalEstimasi)}</p>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Peta usulan</h2>
            <p className="text-sm text-stone-500">
              {jumlahBerlokasi} usulan punya titik lokasi dari hasil filter saat ini.
            </p>
          </div>
          <Link to="/usulan/baru" className="text-sm font-medium text-emerald-800 underline">
            Usulkan lokasi baru
          </Link>
        </div>
        {proposalsQuery.isPending ? (
          <div className="h-96 animate-pulse rounded-xl bg-stone-200" />
        ) : jumlahBerlokasi === 0 ? (
          <EmptyState
            title="Belum ada usulan berlokasi di peta"
            description="Usulan tanpa titik tetap tampil di daftar bawah. Tambahkan titik saat membuat usulan agar mudah ditemukan."
          />
        ) : (
          <ProposalMap proposals={filtered} />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-bold">Daftar usulan</h2>
          <Link to="/usulan/baru" className="text-sm font-medium text-emerald-800 underline">
            Buat usulan
          </Link>
        </div>

        <ProposalFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          resultCount={filtered.length}
          totalCount={proposals.length}
        />

        {proposalsQuery.isPending && <ListSkeleton />}

        {proposalsQuery.isError && (
          <ErrorState
            message={proposalsQuery.error.message}
            onRetry={() => {
              void proposalsQuery.refetch();
            }}
          />
        )}

        {proposalsQuery.isSuccess && proposals.length === 0 && (
          <EmptyState
            title="Belum ada usulan"
            description="Jadilah yang pertama mengusulkan program untuk kotamu."
            action={
              <Link to="/usulan/baru" className={buttonClass('primary')}>
                Buat usulan pertama
              </Link>
            }
          />
        )}

        {proposalsQuery.isSuccess && proposals.length > 0 && filtered.length === 0 && (
          <EmptyState
            title="Tidak ada usulan yang cocok"
            description="Coba kata kunci lain atau ubah filter status."
          />
        )}

        {filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
