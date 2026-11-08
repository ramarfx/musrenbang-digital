import {
  PROPOSAL_MODERATION_STATUSES,
  type Proposal,
  type ProposalModeration,
} from '@musrenbang/shared';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useCommentCountsQuery } from '@/features/comments/queries';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { cn } from '@/lib/cn';
import { formatRupiahRingkas } from '@/lib/format';
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

/** Sudah berapa hari usulan menunggu. */
function umurHari(dibuatPada: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dibuatPada).getTime()) / 86_400_000));
}

const aman = (ulasan: Ulasan) => ulasan?.state === 'completed' && ulasan.flags.length === 0;

/** Label dan alasan MusrenAI di kartu usulan. */
function HasilAi({ ulasan, sedang }: { ulasan: Ulasan; sedang: boolean }) {
  if (sedang || ulasan?.state === 'pending' || ulasan?.state === 'processing')
    return <p className="text-[12.5px] text-muted">MusrenAI sedang memeriksa...</p>;
  if (!ulasan || ulasan.state !== 'completed')
    return (
      <span className="w-fit rounded-md bg-pasir px-1.5 py-0.5 text-[11.5px] font-semibold text-ink">
        {ulasan?.state === 'stale' ? 'Isi berubah, periksa ulang' : 'Belum diperiksa'}
      </span>
    );
  return (
    <div className="anim-chip grid gap-1">
      <span className="flex flex-wrap gap-1">
        {ulasan.flags.length === 0 ? (
          <span className="rounded-md bg-mint-pucat px-1.5 py-0.5 text-[11.5px] font-semibold text-mint-tua">
            Tanpa indikasi
          </span>
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
      {ulasan.flags.length > 0 && ulasan.reason && (
        <p className="line-clamp-2 text-[12.5px] text-ink/80">{ulasan.reason}</p>
      )}
    </div>
  );
}

function KartuUsulan({
  proposal,
  ulasan,
  sedangAi,
  komentar,
  aksi,
  onLihat,
}: {
  proposal: Proposal;
  ulasan: Ulasan;
  sedangAi: boolean;
  komentar: number;
  aksi: ReactNode;
  onLihat: () => void;
}) {
  const hari = umurHari(proposal.dibuat_pada);
  return (
    <li className="grid gap-2 rounded-2xl bg-active/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onLihat}
          className="min-w-0 text-left text-sm font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
        >
          {proposal.judul}
        </button>
        {proposal.moderasi === 'Menunggu' ? (
          <span
            className={cn(
              'flex-none rounded-lg px-2 py-0.5 text-[12px] font-semibold',
              hari >= 3 ? 'bg-[#F5B9B0] text-hitam' : 'bg-pasir text-ink',
            )}
          >
            {hari === 0 ? 'Hari ini' : `${hari} hari`}
          </span>
        ) : (
          <ModerationBadge moderasi={proposal.moderasi} />
        )}
      </div>
      <p className="truncate text-[12.5px] text-muted">
        {proposal.kategori} · {formatRupiahRingkas(proposal.estimasi_biaya)} ·{' '}
        {proposal.jumlah_suara} suara · {komentar} komentar
      </p>
      <HasilAi ulasan={ulasan} sedang={sedangAi} />
      <div className="flex flex-wrap gap-2">
        {aksi}
        <Button type="button" size="sm" variant="outline" onClick={onLihat}>
          Lihat
        </Button>
      </div>
    </li>
  );
}

/**
 * Antrean tinjau admin, dipilah MusrenAI menjadi dua tumpukan: "Aman" (tanpa indikasi, bisa
 * disetujui sekaligus) dan "Perlu dicek" (ditandai atau belum diperiksa). Rincian lengkap tiap
 * usulan dibuka lewat tombol Lihat.
 */
export function AntreanTinjau({
  proposals,
  onLihat,
  sedangDiproses,
  onSetujui,
  onSetujuiBanyak,
  onTolak,
}: {
  proposals: Proposal[];
  onLihat: (proposal: Proposal) => void;
  /** Id usulan yang sedang diproses (-1 saat menyetujui sekaligus), supaya tombol dikunci. */
  sedangDiproses: number | null;
  onSetujui: (proposal: Proposal) => void;
  onSetujuiBanyak: (proposals: Proposal[]) => Promise<void>;
  onTolak: (proposal: Proposal) => void;
}) {
  const [saring, setSaring] = useState<Saring>('Menunggu');
  const [urutan, setUrutan] = useState<Urutan>('terlama');
  const [kategori, setKategori] = useState('semua');
  const [konfirmasi, setKonfirmasi] = useState(false);
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
  const [proses, setProses] = useState<{ sekarang: number; total: number; id: number } | null>(
    null,
  );
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

  const tumpukanAman = tampil.filter((proposal) => aman(hasil.get(proposal.id)));
  const tumpukanCek = tampil.filter((proposal) => !aman(hasil.get(proposal.id)));
  const bisaDisetujui = tumpukanAman.filter((proposal) => proposal.moderasi !== 'Disetujui');

  // Satu per satu, karena tiap analisis memakai kuota penyedia AI bersama.
  const analisisSemua = async () => {
    const daftar = perluAnalisis;
    setGalat(null);
    for (let i = 0; i < daftar.length; i += 1) {
      setProses({ sekarang: i + 1, total: daftar.length, id: daftar[i]!.id });
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

  const kartu = (proposal: Proposal, aksi: ReactNode) => (
    <KartuUsulan
      key={proposal.id}
      proposal={proposal}
      ulasan={hasil.get(proposal.id)}
      sedangAi={proses?.id === proposal.id}
      komentar={jumlahKomentar[proposal.id] ?? 0}
      aksi={aksi}
      onLihat={() => onLihat(proposal)}
    />
  );

  const tombolSetujui = (proposal: Proposal) =>
    proposal.moderasi !== 'Disetujui' && (
      <Button
        type="button"
        size="sm"
        isLoading={sedangDiproses === proposal.id}
        disabled={sedangDiproses !== null}
        onClick={() => onSetujui(proposal)}
      >
        Setujui
      </Button>
    );

  const tombolTolak = (proposal: Proposal) =>
    proposal.moderasi !== 'Ditolak' && (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={sedangDiproses !== null}
        onClick={() => onTolak(proposal)}
      >
        Tolak
      </Button>
    );

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Antrean tinjau</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            MusrenAI memilah usulan menjadi yang aman dan yang perlu kamu cek.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
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
      </div>

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

      {diperiksa.length > 0 && (
        <div className="mt-3 rounded-2xl bg-active px-3.5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-[13.5px] text-ink">
              <b>MusrenAI</b>
              {aiTakTersedia
                ? ' belum tersedia, semua usulan masuk Perlu dicek'
                : proses
                  ? ` sedang memeriksa ${proses.sekarang} dari ${proses.total}`
                  : ` sudah memeriksa ${sudahDianalisis} dari ${diperiksa.length} usulan`}
            </p>
            {!aiTakTersedia && (
              <Button
                type="button"
                size="sm"
                isLoading={proses !== null}
                disabled={proses !== null || memuatUlasan || perluAnalisis.length === 0}
                onClick={() => void analisisSemua()}
              >
                {proses
                  ? 'Memeriksa...'
                  : perluAnalisis.length > 0
                    ? `Periksa ${perluAnalisis.length} usulan`
                    : 'Semua sudah diperiksa'}
              </Button>
            )}
          </div>
          {proses && (
            <div
              role="progressbar"
              aria-label="Kemajuan pemeriksaan MusrenAI"
              aria-valuemin={0}
              aria-valuemax={proses.total}
              aria-valuenow={proses.sekarang - 1}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-track"
            >
              <i
                className="block h-full origin-left rounded-full bg-hijau-terang transition-transform duration-300 ease-out"
                style={{ transform: `scaleX(${(proses.sekarang - 1) / proses.total})` }}
              />
            </div>
          )}
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
        <div key={saring} className="stagger mt-4 grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="judul-tumpukan-aman" className="grid content-start gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="judul-tumpukan-aman" className="font-bold">
                Aman <span className="text-muted tabular-nums">({tumpukanAman.length})</span>
              </h3>
              {bisaDisetujui.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  isLoading={sedangDiproses === -1}
                  disabled={sedangDiproses !== null}
                  onClick={() => setKonfirmasi(true)}
                >
                  Setujui semua ({bisaDisetujui.length})
                </Button>
              )}
            </div>
            {tumpukanAman.length === 0 ? (
              <p className="rounded-2xl bg-active/70 p-3 text-[13px] text-muted">
                Belum ada usulan yang dinyatakan aman. Tekan Periksa supaya MusrenAI memilahnya.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {tumpukanAman.map((proposal) => kartu(proposal, tombolSetujui(proposal)))}
              </ul>
            )}
          </section>

          <section aria-labelledby="judul-tumpukan-cek" className="grid content-start gap-2.5">
            <h3 id="judul-tumpukan-cek" className="flex min-h-8 items-center font-bold">
              Perlu dicek{' '}
              <span className="ml-1 text-muted tabular-nums">({tumpukanCek.length})</span>
            </h3>
            {tumpukanCek.length === 0 ? (
              <p className="rounded-2xl bg-active/70 p-3 text-[13px] text-muted">
                Tidak ada usulan yang perlu dicek.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {tumpukanCek.map((proposal) =>
                  kartu(
                    proposal,
                    <>
                      {tombolTolak(proposal)}
                      {tombolSetujui(proposal)}
                    </>,
                  ),
                )}
              </ul>
            )}
          </section>
        </div>
      )}

      <Modal
        open={konfirmasi}
        onClose={() => setKonfirmasi(false)}
        labelledBy="judul-setujui-semua"
        className="w-[min(440px,calc(100vw-24px))]"
      >
        <div className="p-6">
          <h2 id="judul-setujui-semua" className="text-lg font-bold">
            Setujui {bisaDisetujui.length} usulan sekaligus?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Semua usulan di tumpukan Aman akan tampil publik. MusrenAI hanya membantu memilah, jadi
            pastikan judulnya sudah kamu lihat.
          </p>
          <ul className="mt-3 max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm">
            {bisaDisetujui.map((proposal) => (
              <li key={proposal.id}>{proposal.judul}</li>
            ))}
          </ul>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setKonfirmasi(false)}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => {
                setKonfirmasi(false);
                void onSetujuiBanyak(bisaDisetujui);
              }}
            >
              Setujui semua
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
