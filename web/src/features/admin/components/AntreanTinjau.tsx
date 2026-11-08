import {
  PROPOSAL_MODERATION_STATUSES,
  type Proposal,
  type ProposalModeration,
} from '@musrenbang/shared';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { useCommentCountsQuery } from '@/features/comments/queries';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { cn } from '@/lib/cn';
import { formatTanggal } from '@/lib/format';
import { analyzeProposal, getAiReview } from '../ai-api';
import { LABEL_INDIKASI } from './labelIndikasi';

type Saring = ProposalModeration | 'semua';
type Urutan = 'terlama' | 'terbaru' | 'ramai' | 'suara' | 'komentar';

const PILIHAN_URUTAN: { nilai: Urutan; label: string }[] = [
  { nilai: 'terlama', label: 'Terlama menunggu' },
  { nilai: 'terbaru', label: 'Terbaru' },
  { nilai: 'ramai', label: 'Paling ramai (suara + komentar)' },
  { nilai: 'suara', label: 'Suara terbanyak' },
  { nilai: 'komentar', label: 'Komentar terbanyak' },
];

type Ulasan = Awaited<ReturnType<typeof getAiReview>> | undefined;

/** Usulan yang diperiksa MusrenAI sekali jalan; sisanya menyusul pada putaran berikutnya. */
const BATAS_ANALISIS = 20;

function ChipAi({ ulasan }: { ulasan: Ulasan }) {
  if (!ulasan || ulasan.state === 'not_analyzed') return null;
  if (ulasan.state === 'pending' || ulasan.state === 'processing')
    return <span className="mt-1 block text-[12px] text-muted">MusrenAI: sedang dianalisis</span>;
  if (ulasan.state !== 'completed') return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {ulasan.flags.length === 0 ? (
        <span className="text-[12px] text-muted">MusrenAI: tanpa indikasi</span>
      ) : (
        ulasan.flags.map((flag) => (
          <span
            key={flag}
            className="rounded-md bg-[#F5B9B0] px-1.5 py-0.5 text-[11.5px] font-semibold text-hitam"
          >
            {LABEL_INDIKASI[flag]}
          </span>
        ))
      )}
    </span>
  );
}

/** Sudah berapa hari usulan menunggu; tiga hari atau lebih dianggap lama. */
function umurHari(dibuatPada: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dibuatPada).getTime()) / 86_400_000));
}

/**
 * Antrean tinjau di kolom kiri halaman admin: usulan yang menunggu paling lama di atas. Memilih
 * baris menampilkan rinciannya di kolom kanan; menyetujui bisa langsung dari baris, menolak
 * lewat pop-up yang mewajibkan alasan.
 */
export function AntreanTinjau({
  proposals,
  terpilihId,
  onPilih,
  sedangDiproses,
  onSetujui,
  onTolak,
}: {
  proposals: Proposal[];
  terpilihId: number | null;
  onPilih: (id: number | null) => void;
  /** Id usulan yang sedang diproses, supaya tombolnya bisa dikunci. */
  sedangDiproses: number | null;
  onSetujui: (proposal: Proposal) => void;
  onTolak: (proposal: Proposal) => void;
}) {
  const [saring, setSaring] = useState<Saring>('Menunggu');
  const [urutan, setUrutan] = useState<Urutan>('terlama');
  const [kategori, setKategori] = useState('semua');
  const jumlahKomentar = useCommentCountsQuery().data ?? {};
  const daftarKategori = useMemo(
    () => [...new Set(proposals.map((proposal) => proposal.kategori))].sort(),
    [proposals],
  );

  const jumlah = useMemo(() => {
    const hasil = { semua: proposals.length } as Record<Saring, number>;
    for (const item of PROPOSAL_MODERATION_STATUSES) {
      hasil[item] = proposals.filter((proposal) => proposal.moderasi === item).length;
    }
    return hasil;
  }, [proposals]);

  const tampil = useMemo(() => {
    const waktu = (proposal: Proposal) => new Date(proposal.dibuat_pada).getTime();
    const komentar = (proposal: Proposal) => jumlahKomentar[proposal.id] ?? 0;
    const pembanding: Record<Urutan, (a: Proposal, b: Proposal) => number> = {
      terlama: (a, b) => waktu(a) - waktu(b),
      terbaru: (a, b) => waktu(b) - waktu(a),
      suara: (a, b) => b.jumlah_suara - a.jumlah_suara || waktu(a) - waktu(b),
      komentar: (a, b) => komentar(b) - komentar(a) || waktu(a) - waktu(b),
      ramai: (a, b) =>
        b.jumlah_suara + komentar(b) - (a.jumlah_suara + komentar(a)) || waktu(a) - waktu(b),
    };
    return proposals
      .filter((proposal) => saring === 'semua' || proposal.moderasi === saring)
      .filter((proposal) => kategori === 'semua' || proposal.kategori === kategori)
      .sort(pembanding[urutan]);
  }, [proposals, saring, kategori, urutan, jumlahKomentar]);

  const queryClient = useQueryClient();
  const [proses, setProses] = useState<{ sekarang: number; total: number } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const diperiksa = useMemo(() => tampil.slice(0, BATAS_ANALISIS), [tampil]);
  const ulasan = useQueries({
    queries: diperiksa.map((proposal) => ({
      queryKey: ['admin', 'ai-review', proposal.id] as const,
      queryFn: () => getAiReview(proposal.id),
      retry: false,
      staleTime: 30_000,
    })),
  });
  const hasil = new Map<number, Ulasan>(
    diperiksa.map((proposal, i) => [proposal.id, ulasan[i]?.data]),
  );
  const memuatUlasan = ulasan.some((query) => query.isPending);
  const aiTakTersedia = ulasan.length > 0 && ulasan.every((query) => query.isError);
  const perluAnalisis = diperiksa.filter((proposal) => {
    const item = hasil.get(proposal.id);
    return !item || ['not_analyzed', 'stale', 'failed'].includes(item.state);
  });
  const sudahDianalisis = diperiksa.filter(
    (proposal) => hasil.get(proposal.id)?.state === 'completed',
  ).length;
  const ditandai = diperiksa.filter((proposal) => {
    const item = hasil.get(proposal.id);
    return item?.state === 'completed' && item.flags.length > 0;
  }).length;

  // Satu per satu, karena tiap analisis memakai kuota penyedia AI bersama.
  const analisisSemua = async () => {
    const daftar = perluAnalisis;
    setGalat(null);
    for (let i = 0; i < daftar.length; i += 1) {
      setProses({ sekarang: i + 1, total: daftar.length });
      try {
        await analyzeProposal(daftar[i]!.id);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'ai-review', daftar[i]!.id] });
      } catch (error) {
        setGalat(error instanceof Error ? error.message : 'Analisis AI gagal.');
        break;
      }
    }
    setProses(null);
  };

  // Rincian di kanan selalu menunjukkan usulan yang ada di daftar ini.
  useEffect(() => {
    if (tampil.length === 0) {
      if (terpilihId !== null) onPilih(null);
    } else if (!tampil.some((proposal) => proposal.id === terpilihId)) {
      onPilih(tampil[0]!.id);
    }
  }, [tampil, terpilihId, onPilih]);

  return (
    <Card className="flex flex-col lg:min-h-[600px]">
      <h2 className="text-lg font-bold">Antrean tinjau</h2>
      <p className="mt-0.5 text-[13px] text-muted">
        Usulan yang perlu kamu putuskan. Daftar menggulir kalau panjang.
      </p>
      <div role="group" aria-label="Saring menurut moderasi" className="mt-3 flex flex-wrap gap-2">
        {(['Menunggu', 'Ditolak', 'Disetujui', 'semua'] as const).map((pilihan) => (
          <button
            key={pilihan}
            type="button"
            aria-pressed={saring === pilihan}
            onClick={() => setSaring(pilihan)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
              saring === pilihan
                ? 'border-ink bg-ink text-on-ink'
                : 'border-border bg-surface text-ink hover:bg-active',
            )}
          >
            {pilihan === 'semua' ? 'Semua' : pilihan}
            <span className="tabular-nums opacity-70">{jumlah[pilihan]}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="min-w-0">
          <span className="sr-only">Urutkan</span>
          <Select
            value={urutan}
            onChange={(event) => setUrutan(event.target.value as Urutan)}
            className="h-9 py-0 text-[13.5px]"
          >
            {PILIHAN_URUTAN.map((pilihan) => (
              <option key={pilihan.nilai} value={pilihan.nilai}>
                {pilihan.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Kategori</span>
          <Select
            value={kategori}
            onChange={(event) => setKategori(event.target.value)}
            className="h-9 py-0 text-[13.5px]"
          >
            <option value="semua">Semua kategori</option>
            {daftarKategori.map((nama) => (
              <option key={nama} value={nama}>
                {nama}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {diperiksa.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-active px-3 py-2">
            <p className="min-w-0 text-[13px] text-ink">
              <b>MusrenAI</b>
              {aiTakTersedia
                ? ' belum tersedia'
                : ` · ${sudahDianalisis} dari ${diperiksa.length} dianalisis${ditandai > 0 ? `, ${ditandai} perlu perhatian` : ''}`}
            </p>
            {!aiTakTersedia && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={proses !== null}
                disabled={memuatUlasan || perluAnalisis.length === 0}
                onClick={() => void analisisSemua()}
              >
                {proses ? `Menganalisis ${proses.sekarang}/${proses.total}` : 'Analisis AI'}
              </Button>
            )}
          </div>
          {galat && (
            <p role="alert" className="mt-1.5 text-[13px] text-red-700">
              {galat}
            </p>
          )}
        </div>
      )}

      {tampil.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={
              saring === 'Menunggu' ? 'Tidak ada usulan yang menunggu' : 'Tidak ada usulan di sini'
            }
            description={
              saring === 'Menunggu'
                ? 'Semua usulan yang masuk sudah ditinjau.'
                : 'Ubah penyaring untuk melihat usulan lain.'
            }
          />
        </div>
      ) : (
        <div className="relative mt-3 min-h-0 flex-1 max-lg:max-h-[420px] max-lg:min-h-[240px]">
          <ul
            key={saring}
            className="stagger space-y-2 overflow-y-auto pr-1 max-lg:h-full lg:absolute lg:inset-0"
          >
            {tampil.map((proposal) => {
              const dipilih = proposal.id === terpilihId;
              return (
                <li
                  key={proposal.id}
                  onClick={() => onPilih(proposal.id)}
                  className={cn(
                    'cursor-pointer rounded-2xl border-[1.5px] p-2.5 transition-colors duration-150',
                    dipilih
                      ? 'border-edge bg-active'
                      : 'border-border bg-surface hover:bg-active/60',
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={dipilih}
                    onClick={() => onPilih(proposal.id)}
                    className="block w-full rounded-xl p-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <b className="min-w-0 truncate text-sm">{proposal.judul}</b>
                      {proposal.moderasi === 'Menunggu' ? (
                        <span
                          className={cn(
                            'flex-none rounded-lg px-2 py-0.5 text-[12px] font-semibold',
                            umurHari(proposal.dibuat_pada) >= 3
                              ? 'bg-[#F5B9B0] text-hitam'
                              : 'bg-pasir text-ink',
                          )}
                        >
                          {umurHari(proposal.dibuat_pada) === 0
                            ? 'Hari ini'
                            : `${umurHari(proposal.dibuat_pada)} hari`}
                        </span>
                      ) : (
                        <ModerationBadge moderasi={proposal.moderasi} />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                      {proposal.pengusul_nama} · {proposal.kategori} ·{' '}
                      {formatTanggal(proposal.dibuat_pada)}
                    </span>
                  </button>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[12.5px] text-muted">
                        {proposal.jumlah_suara} suara · {jumlahKomentar[proposal.id] ?? 0} komentar
                      </span>
                      <ChipAi ulasan={hasil.get(proposal.id)} />
                    </div>
                    <div
                      className="flex flex-none gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {proposal.moderasi !== 'Disetujui' && (
                        <Button
                          type="button"
                          size="sm"
                          isLoading={sedangDiproses === proposal.id}
                          disabled={sedangDiproses !== null}
                          onClick={() => onSetujui(proposal)}
                        >
                          Setujui
                        </Button>
                      )}
                      {proposal.moderasi !== 'Ditolak' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={sedangDiproses !== null}
                          onClick={() => onTolak(proposal)}
                        >
                          Tolak
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
