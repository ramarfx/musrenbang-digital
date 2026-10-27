import { buttonClass } from '@/components/ui/Button';
import { PROPOSAL_STATUSES, type ProposalStatus } from '@musrenbang/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CaraKerja } from '@/components/CaraKerja';
import { ProposalMap } from '@/components/map/ProposalMap';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProposalCard } from '@/features/proposals/components/ProposalCard';
import { TopProposals } from '@/features/proposals/components/TopProposals';
import { ProposalFilters } from '@/features/proposals/components/ProposalFilters';
import { useCategoriesQuery } from '@/features/categories/queries';
import { useProposalsQuery } from '@/features/proposals/queries';
import { formatAngka, formatRupiahRingkas } from '@/lib/format';

export default function Beranda() {
  const proposalsQuery = useProposalsQuery();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProposalStatus | 'semua'>('semua');
  const [kategori, setKategori] = useState('semua');
  const [urutan, setUrutan] = useState<'terbaru' | 'terpopuler'>('terbaru');
  const categoriesQuery = useCategoriesQuery();

  const proposals = proposalsQuery.data ?? [];
  const cocokKeyword = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return proposals.filter(
      (proposal) =>
        keyword.length === 0 ||
        proposal.judul.toLowerCase().includes(keyword) ||
        proposal.deskripsi.toLowerCase().includes(keyword) ||
        proposal.kategori.toLowerCase().includes(keyword) ||
        proposal.pengusul_nama.toLowerCase().includes(keyword),
    );
  }, [proposals, search]);
  // Filter kategori dan status bekerja bersamaan, dan angka di tiap pilihan mengikuti filter lain.
  const cocokKategori = useMemo(
    () =>
      kategori === 'semua'
        ? cocokKeyword
        : cocokKeyword.filter((proposal) => proposal.kategori === kategori),
    [cocokKeyword, kategori],
  );
  const filtered = useMemo(() => {
    const hasil =
      status === 'semua'
        ? [...cocokKategori]
        : cocokKategori.filter((proposal) => proposal.status === status);
    if (urutan === 'terpopuler') {
      hasil.sort(
        (a, b) =>
          b.jumlah_suara - a.jumlah_suara ||
          new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime(),
      );
    }
    return hasil;
  }, [cocokKategori, status, urutan]);
  // Angka di tombol status mengikuti kata kunci, supaya tidak menjanjikan hasil yang kosong.
  const counts = useMemo(() => {
    const hasil = { semua: cocokKategori.length } as Record<ProposalStatus | 'semua', number>;
    for (const item of PROPOSAL_STATUSES) {
      hasil[item] = cocokKategori.filter((proposal) => proposal.status === item).length;
    }
    return hasil;
  }, [cocokKategori]);
  const daftarKategori = useMemo(() => {
    const menurutStatus =
      status === 'semua' ? cocokKeyword : cocokKeyword.filter((p) => p.status === status);
    return (categoriesQuery.data ?? []).map((item) => ({
      nama: item.nama,
      jumlah: menurutStatus.filter((proposal) => proposal.kategori === item.nama).length,
    }));
  }, [categoriesQuery.data, cocokKeyword, status]);

  const totalSuara = proposals.reduce((sum, proposal) => sum + proposal.jumlah_suara, 0);
  const totalEstimasi = proposals.reduce((sum, proposal) => sum + proposal.estimasi_biaya, 0);
  const jumlahBerlokasi = filtered.filter(
    (proposal) => proposal.latitude !== null && proposal.longitude !== null,
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Anggaran kota, diputuskan bersama."
        description="Usulkan program, urutkan prioritas anggaran, upvote usulan warga, dan bandingkan prioritas warga dengan APBD yang sebenarnya."
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

      <section className="stagger grid gap-3 sm:grid-cols-3" aria-label="Ringkasan partisipasi">
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

      <CaraKerja />

      {proposalsQuery.isSuccess && <TopProposals proposals={proposals} />}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Peta usulan</h2>
            <p className="text-sm text-stone-500">
              {jumlahBerlokasi} usulan punya titik lokasi dari hasil filter saat ini.
            </p>
          </div>
          <Link to="/usulan/baru" className="text-sm font-semibold text-warga underline">
            Usulkan lokasi baru
          </Link>
        </div>
        {proposalsQuery.isPending ? (
          <div className="load-late h-96 animate-pulse rounded-3xl bg-stone-200" />
        ) : proposalsQuery.isError ? (
          <ErrorState
            title="Peta usulan gagal dimuat"
            message={proposalsQuery.error.message}
            onRetry={() => {
              void proposalsQuery.refetch();
            }}
          />
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
          <Link to="/usulan/baru" className="text-sm font-semibold text-warga underline">
            Buat usulan
          </Link>
        </div>

        <ProposalFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          counts={counts}
          kategori={kategori}
          onKategoriChange={setKategori}
          daftarKategori={daftarKategori}
          urutan={urutan}
          onUrutanChange={setUrutan}
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
            description="Coba kata kunci lain atau ubah filter kategori dan status."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatus('semua');
                  setKategori('semua');
                }}
                className={buttonClass('outline')}
              >
                Hapus filter
              </button>
            }
          />
        )}

        {filtered.length > 0 && (
          <div className="stagger grid gap-4 md:grid-cols-2">
            {filtered.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
