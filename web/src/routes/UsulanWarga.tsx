import { buttonClass } from '@/components/ui/Button';
import { PROPOSAL_STATUSES, type ProposalStatus } from '@musrenbang/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelPetaUsulan } from '@/components/map/PanelPetaUsulan';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { ListSkeleton } from '@/components/ui/Skeleton';
import type { LangkahTur } from '@/components/tutorial/TurHalaman';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProposalCard } from '@/features/proposals/components/ProposalCard';
import { TopProposals } from '@/features/proposals/components/TopProposals';
import { ProposalFilters } from '@/features/proposals/components/ProposalFilters';
import { cn } from '@/lib/cn';
import { useCategoriesQuery } from '@/features/categories/queries';
import { useProposalsQuery } from '@/features/proposals/queries';

/** Jumlah kartu usulan per halaman daftar. */
const KARTU_PER_HALAMAN = 6;
/** Tampilan daftar lebih ringkas per usulan, jadi muat lebih banyak. */
const BARIS_PER_HALAMAN = 10;

/** Semua usulan warga yang sudah disetujui: terpopuler, peta, lalu daftar dengan filter. */
const TUR_USULAN: readonly LangkahTur[] = [
  {
    target: 'peta',
    judul: 'Peta usulan',
    isi: 'Tiap titik adalah satu usulan. Cincin di titik menunjukkan tahapnya: makin penuh, makin dekat selesai.',
  },
  {
    target: 'saring',
    judul: 'Cari usulan',
    isi: 'Ketik kata kunci atau saring berdasarkan status dan bidang supaya cepat ketemu.',
  },
  {
    target: 'dukung',
    judul: 'Dukung usulan',
    isi: 'Tekan tombol panah ini pada usulan yang menurutmu penting. Usulan dengan dukungan terbanyak naik ke atas.',
  },
  {
    target: 'buat',
    judul: 'Punya usulan sendiri?',
    isi: 'Tekan di sini untuk menulis usulan untuk lingkunganmu.',
  },
];

export default function UsulanWarga() {
  const proposalsQuery = useProposalsQuery();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProposalStatus | 'semua'>('semua');
  const [kategori, setKategori] = useState('semua');
  const [urutan, setUrutan] = useState<'terbaru' | 'terpopuler'>('terbaru');
  const [halaman, setHalaman] = useState(1);
  const [tampilan, setTampilan] = useState<'kartu' | 'daftar'>('kartu');
  const perHalaman = tampilan === 'kartu' ? KARTU_PER_HALAMAN : BARIS_PER_HALAMAN;
  const daftarRef = useRef<HTMLElement>(null);
  const categoriesQuery = useCategoriesQuery();

  // Pengguna yang masuk juga menerima usulan miliknya yang belum disetujui; daftar publik tidak boleh memuatnya.
  const proposals = useMemo(
    () => (proposalsQuery.data ?? []).filter((proposal) => proposal.moderasi === 'Disetujui'),
    [proposalsQuery.data],
  );
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

  // Daftar dibagi per halaman supaya tidak memanjang ke bawah. Filter baru selalu mulai dari halaman 1.
  useEffect(() => {
    setHalaman(1);
  }, [search, status, kategori, urutan, tampilan]);
  const totalHalaman = Math.max(1, Math.ceil(filtered.length / perHalaman));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const tampilHalaman = filtered.slice(
    (halamanAktif - 1) * perHalaman,
    halamanAktif * perHalaman,
  );
  const gantiHalaman = (tujuan: number) => {
    setHalaman(tujuan);
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    daftarRef.current?.scrollIntoView({
      block: 'start',
      behavior: kurangiGerak ? 'auto' : 'smooth',
    });
  };

  const jumlahBerlokasi = filtered.filter(
    (proposal) => proposal.latitude !== null && proposal.longitude !== null,
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usulan warga"
        tur={TUR_USULAN}
        description="Dukung usulan yang menurutmu penting, atau tulis usulan untuk lingkunganmu."
        actions={
          <Link to="/usulan/baru" data-tur="buat" className={buttonClass('primary')}>
            Buat usulan
          </Link>
        }
      />

      {proposalsQuery.isSuccess && <TopProposals proposals={proposals} />}

      <section data-tur="peta">
        <div className="mb-3">
          <h2 className="text-xl font-bold">Peta usulan</h2>
          <p className="text-sm text-muted">
            {jumlahBerlokasi} usulan punya titik lokasi dari hasil filter saat ini. Cincin di tiap
            titik menunjukkan tahap usulan: makin penuh, makin dekat selesai. Pilih wilayah untuk
            melihat batasnya.
          </p>
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
          <PanelPetaUsulan proposals={filtered} />
        )}
      </section>

      <section ref={daftarRef} className="scroll-mt-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Daftar usulan</h2>
          <div
            role="group"
            aria-label="Tampilan daftar"
            className="flex rounded-xl border border-border bg-surface p-0.5"
          >
            {(
              [
                ['kartu', 'Kartu', 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'],
                ['daftar', 'Daftar', 'M4 6h16M4 12h16M4 18h16'],
              ] as const
            ).map(([nilai, label, ikon]) => (
              <button
                key={nilai}
                type="button"
                aria-pressed={tampilan === nilai}
                onClick={() => setTampilan(nilai)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                  tampilan === nilai ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink',
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="size-4"
                >
                  <path d={ikon} />
                </svg>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div data-tur="saring">
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
        </div>

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
          <>
            <div
              className={cn(
                'grid gap-2.5',
                tampilan === 'kartu'
                  ? 'auto-rows-fr min-[350px]:grid-cols-2 md:gap-5'
                  : 'grid-cols-1 sm:gap-3',
              )}
            >
              {tampilHalaman.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  turDukung="dukung"
                  daftar={tampilan === 'daftar'}
                />
              ))}
            </div>
            <Pagination
              halaman={halamanAktif}
              totalHalaman={totalHalaman}
              onHalaman={gantiHalaman}
              label="Halaman daftar usulan"
            />
          </>
        )}
      </section>
    </div>
  );
}
