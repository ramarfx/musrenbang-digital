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
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { getCategoryInfo } from '@/features/categories/info';
import { useCommentCountsQuery } from '@/features/comments/queries';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { cn } from '@/lib/cn';
import { analyzeProposal, getAiReview } from '../ai-api';
import { LABEL_INDIKASI } from './labelIndikasi';

type Saring = ProposalModeration | 'semua';
type SaringAi = 'semua' | 'aman' | 'cek';
type Urutan = 'terlama' | 'terbaru' | 'ramai' | 'suara' | 'komentar';

const PILIHAN_URUTAN: { nilai: Urutan; label: string }[] = [
  { nilai: 'terlama', label: 'Terlama' },
  { nilai: 'terbaru', label: 'Terbaru' },
  { nilai: 'ramai', label: 'Paling ramai' },
  { nilai: 'suara', label: 'Suara terbanyak' },
  { nilai: 'komentar', label: 'Komentar terbanyak' },
];

type Ulasan = Awaited<ReturnType<typeof getAiReview>> | undefined;

/** Usulan yang diperiksa MusrenAI sekali jalan; sisanya menyusul pada putaran berikutnya. */
const BATAS_ANALISIS = 20;

const aman = (ulasan: Ulasan) => ulasan?.state === 'completed' && ulasan.flags.length === 0;

/** Label hasil MusrenAI di baris antrean. */
function ChipAi({ ulasan, sedang = false }: { ulasan: Ulasan; sedang?: boolean }) {
  if (sedang || ulasan?.state === 'pending' || ulasan?.state === 'processing')
    return <span className="flex-none text-[12px] text-muted">Memeriksa...</span>;
  if (!ulasan || ulasan.state !== 'completed')
    return (
      <span className="flex-none rounded-md bg-pasir px-1.5 py-0.5 text-[11.5px] font-semibold text-ink">
        Belum diperiksa
      </span>
    );
  if (ulasan.flags.length === 0)
    return (
      <span className="anim-chip flex-none rounded-md bg-mint-pucat px-1.5 py-0.5 text-[11.5px] font-semibold text-mint-tua">
        Aman
      </span>
    );
  return (
    <span className="anim-chip flex-none rounded-md bg-[#F5B9B0] px-1.5 py-0.5 text-[11.5px] font-semibold text-hitam">
      {LABEL_INDIKASI[ulasan.flags[0]!]}
      {ulasan.flags.length > 1 && ` +${ulasan.flags.length - 1}`}
    </span>
  );
}

/** Sudah berapa hari usulan menunggu. */
function umurHari(dibuatPada: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dibuatPada).getTime()) / 86_400_000));
}

const kelasTombol = (aktif: boolean) =>
  cn(
    'inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
    aktif ? 'border-ink bg-ink text-on-ink' : 'border-border bg-surface text-ink hover:bg-active',
  );

/**
 * Antrean tinjau di kartu kiri halaman admin. Baris ringkas (judul, umur, hasil MusrenAI); baris
 * yang dipilih berwarna kategori, sama dengan kepala kartu rincian di kanan. MusrenAI bisa
 * memilah antrean menjadi Aman dan Perlu dicek, dan yang aman bisa disetujui sekaligus.
 */
export function AntreanTinjau({
  proposals,
  terpilihId,
  onPilih,
  sedangDiproses,
  onSetujuiBanyak,
}: {
  proposals: Proposal[];
  terpilihId: number | null;
  /** `asalY` adalah posisi tengah baris di layar, dipakai animasi kartu rincian. */
  onPilih: (id: number | null, asalY?: number) => void;
  /** Id usulan yang sedang diproses (-1 saat menyetujui sekaligus), supaya tombol dikunci. */
  sedangDiproses: number | null;
  onSetujuiBanyak: (proposals: Proposal[]) => Promise<void>;
}) {
  const [saring, setSaring] = useState<Saring>('Menunggu');
  const [saringAi, setSaringAi] = useState<SaringAi>('semua');
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

  const tersaring = useMemo(() => {
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
  const diperiksa = useMemo(() => tersaring.slice(0, BATAS_ANALISIS), [tersaring]);
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

  const daftarAman = tersaring.filter((proposal) => aman(hasil.get(proposal.id)));
  const daftarCek = tersaring.filter((proposal) => !aman(hasil.get(proposal.id)));
  const tampil = saringAi === 'aman' ? daftarAman : saringAi === 'cek' ? daftarCek : tersaring;
  const bisaDisetujui = daftarAman.filter((proposal) => proposal.moderasi !== 'Disetujui');
  const idTampil = tampil.map((proposal) => proposal.id).join(',');

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

  // Rincian di kanan selalu menunjukkan usulan yang ada di daftar ini.
  useEffect(() => {
    const ids = idTampil ? idTampil.split(',').map(Number) : [];
    if (ids.length === 0) {
      if (terpilihId !== null) onPilih(null);
    } else if (terpilihId === null || !ids.includes(terpilihId)) {
      onPilih(ids[0]!);
    }
  }, [idTampil, terpilihId, onPilih]);

  return (
    <Card className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-bold">Antrean tinjau</h2>
        <label className="min-w-0">
          <span className="sr-only">Urutkan</span>
          <Select
            value={urutan}
            onChange={(event) => setUrutan(event.target.value as Urutan)}
            className="h-8 py-0 text-[13px]"
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
            className="h-8 max-w-44 py-0 text-[13px]"
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

      <div role="group" aria-label="Saring menurut moderasi" className="mt-3 flex flex-wrap gap-2">
        {(['Menunggu', 'Ditolak', 'Disetujui', 'semua'] as const).map((pilihan) => (
          <button
            key={pilihan}
            type="button"
            aria-pressed={saring === pilihan}
            onClick={() => setSaring(pilihan)}
            className={kelasTombol(saring === pilihan)}
          >
            {pilihan === 'semua' ? 'Semua' : pilihan}
            <span className="tabular-nums opacity-70">{jumlah[pilihan]}</span>
          </button>
        ))}
      </div>

      {diperiksa.length > 0 && (
        <div className="mt-3 rounded-2xl bg-active px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-[13px] text-ink">
              <b>MusrenAI</b>
              {aiTakTersedia
                ? ' belum tersedia'
                : proses
                  ? ` memeriksa ${proses.sekarang} dari ${proses.total}`
                  : ` ${sudahDianalisis} dari ${diperiksa.length} diperiksa`}
            </p>
            {!aiTakTersedia && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={proses !== null}
                disabled={proses !== null || memuatUlasan || perluAnalisis.length === 0}
                onClick={() => void analisisSemua()}
              >
                {proses
                  ? 'Memeriksa...'
                  : perluAnalisis.length > 0
                    ? `Periksa ${perluAnalisis.length}`
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Saring menurut hasil MusrenAI"
          className="flex flex-wrap gap-2"
        >
          {(
            [
              ['semua', 'Semua', tersaring.length],
              ['aman', 'Aman', daftarAman.length],
              ['cek', 'Perlu dicek', daftarCek.length],
            ] as const
          ).map(([nilai, label, n]) => (
            <button
              key={nilai}
              type="button"
              aria-pressed={saringAi === nilai}
              onClick={() => setSaringAi(nilai)}
              className={kelasTombol(saringAi === nilai)}
            >
              {label}
              <span className="tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
        {saringAi === 'aman' && bisaDisetujui.length > 1 && (
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            isLoading={sedangDiproses === -1}
            disabled={sedangDiproses !== null}
            onClick={() => setKonfirmasi(true)}
          >
            Setujui semua ({bisaDisetujui.length})
          </Button>
        )}
      </div>

      {tampil.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={
              saring === 'Menunggu' && saringAi === 'semua'
                ? 'Tidak ada usulan yang menunggu'
                : 'Tidak ada usulan di sini'
            }
            description={
              saringAi === 'aman'
                ? 'Belum ada usulan yang dinyatakan aman. Tekan Periksa supaya MusrenAI memilahnya.'
                : 'Ubah penyaring untuk melihat usulan lain.'
            }
          />
        </div>
      ) : (
        <div className="relative mt-3 min-h-0 flex-1 max-lg:max-h-[420px] max-lg:min-h-[240px]">
          <ul
            key={`${saring}-${saringAi}`}
            className="stagger space-y-2 overflow-y-auto pr-1 max-lg:h-full lg:absolute lg:inset-0"
          >
            {tampil.map((proposal) => {
              const dipilih = proposal.id === terpilihId;
              const hari = umurHari(proposal.dibuat_pada);
              return (
                <li key={proposal.id}>
                  <button
                    type="button"
                    aria-pressed={dipilih}
                    onClick={(event) => {
                      const kotak = event.currentTarget.getBoundingClientRect();
                      onPilih(proposal.id, kotak.top + kotak.height / 2);
                    }}
                    style={
                      dipilih
                        ? { backgroundColor: getCategoryInfo(proposal.kategori).warna.latar }
                        : undefined
                    }
                    className={cn(
                      'block w-full rounded-2xl border-[1.5px] px-3 py-2 text-left transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                      dipilih ? 'border-edge' : 'border-border bg-surface hover:bg-active/60',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <b className="min-w-0 truncate text-sm">{proposal.judul}</b>
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
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'min-w-0 truncate text-[12.5px]',
                          dipilih ? 'text-ink/75' : 'text-muted',
                        )}
                      >
                        {proposal.kategori} · {proposal.pengusul_nama}
                      </span>
                      <ChipAi ulasan={hasil.get(proposal.id)} sedang={proses?.id === proposal.id} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
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
            Semua usulan yang dinyatakan aman oleh MusrenAI akan tampil publik. MusrenAI hanya
            membantu memilah, jadi pastikan judulnya sudah kamu lihat.
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
