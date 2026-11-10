import type { Proposal } from '@musrenbang/shared';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { useCommentCountsQuery } from '@/features/comments/queries';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatAngka, formatTanggal } from '@/lib/format';
import { analyzeProposal, getAiReview } from '../ai-api';
import { useModerateProposalMutation } from '../queries';
import { LABEL_INDIKASI } from './labelIndikasi';
import { PreviewUsulan } from './PreviewUsulan';
import { umurHari } from './umurHari';

type Urutan = 'terlama' | 'terbaru' | 'suara' | 'komentar';
type FlagAi = 'spam' | 'promotion' | 'irrelevant' | 'needs_review';
type SaringAi = 'semua' | 'aman' | FlagAi;
type Ulasan = Awaited<ReturnType<typeof getAiReview>> | undefined;

const FLAGS_AI: FlagAi[] = ['spam', 'promotion', 'irrelevant', 'needs_review'];

/** Indikasi yang boleh ditolak massal. "Perlu ditinjau" sengaja tidak: itu butuh mata admin. */
const FLAGS_TOLAK: FlagAi[] = ['spam', 'promotion', 'irrelevant'];

const alasanBawaan = (flag: FlagAi) =>
  `Ditandai MusrenAI sebagai ${LABEL_INDIKASI[flag].toLowerCase()}.`;

/** Jumlah kartu per halaman antrean. */
const KARTU_PER_HALAMAN = 10;

/** Jeda antar analisis supaya tidak menabrak kuota penyedia AI bersama (10 percobaan per menit). */
const JEDA_KUOTA_MS = 6500;

/** Frasa yang bergantian selama analisis berjalan. */
const FRASA_MUAT = [
  'Menganalisis judul dan isi usulan...',
  'Memeriksa indikasi spam dan promosi...',
  'Menilai relevansi dan kejelasan usulan...',
  'Menyusun ringkasan untuk admin...',
];

const PILIHAN_URUTAN: { nilai: Urutan; label: string }[] = [
  { nilai: 'terlama', label: 'Paling lama menunggu' },
  { nilai: 'terbaru', label: 'Paling baru masuk' },
  { nilai: 'suara', label: 'Dukungan terbanyak' },
  { nilai: 'komentar', label: 'Komentar terbanyak' },
];

const aman = (ulasan: Ulasan) => ulasan?.state === 'completed' && ulasan.flags.length === 0;

function ChipAi({
  ulasan,
  sedang,
  memuat,
  galat,
}: {
  ulasan: Ulasan;
  sedang: boolean;
  memuat: boolean;
  galat: boolean;
}) {
  if (sedang || ulasan?.state === 'pending' || ulasan?.state === 'processing') {
    return <span className="flex-none text-xs text-muted">Sedang diperiksa...</span>;
  }
  if (memuat) {
    return <span className="flex-none text-xs text-muted">Memuat hasil...</span>;
  }
  if (galat && !ulasan) {
    return <span className="flex-none text-xs text-muted">MusrenAI tidak tersedia</span>;
  }
  if (ulasan?.state === 'failed') {
    return <Badge tone="danger">Pemeriksaan gagal</Badge>;
  }
  if (ulasan?.state === 'stale') {
    return <Badge tone="neutral">Perlu diperiksa ulang</Badge>;
  }
  if (ulasan?.state !== 'completed') {
    return <Badge tone="neutral">Belum diperiksa</Badge>;
  }
  if (ulasan.flags.length === 0) {
    return <Badge tone="success">Tidak ada indikasi</Badge>;
  }
  return (
    <Badge tone="danger">
      {LABEL_INDIKASI[ulasan.flags[0]!]}
      {ulasan.flags.length > 1 && ` +${ulasan.flags.length - 1}`}
    </Badge>
  );
}

/**
 * Satu bintang kilau empat titik ala Gemini. Diam secara bawaan; berputar saat tombol atau
 * baris pendampingnya di-hover, atau terus berputar saat MusrenAI benar-benar bekerja lewat
 * prop `jalan`. Digambar di sini sebagai SVG terisi supaya bentuk empat titiknya tetap utuh.
 */
function BintangAi({ jalan = false }: { jalan?: boolean }) {
  return (
    <span aria-hidden="true" className="ai-putar inline-flex flex-none text-warga">
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill="currentColor"
        className={cn('ai-bintang', jalan && 'ai-bintang-jalan')}
      >
        <path d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10z" />
      </svg>
    </span>
  );
}

/** Warna stabilo tiap kategori hasil MusrenAI; berbeda-beda supaya tidak semuanya tampak gawat. */
const WARNA_AMAN = '#A9E3C8';
const WARNA_FLAG: Record<FlagAi, string> = {
  spam: '#F5B9B0',
  promotion: '#F5C79B',
  irrelevant: '#F6D98B',
  needs_review: '#D9CCF0',
};

/**
 * Satu baris ringkasan Summary AI: label stabilo, batang kecil, jumlah, dan panah. Menekannya
 * menyaring antrean ke kategori itu. Batang disembunyikan di layar sempit supaya baris tetap lega.
 */
function BarisRingkasan({
  warna,
  label,
  jumlah,
  maks,
  onPilih,
}: {
  warna: string;
  label: string;
  jumlah: number;
  maks: number;
  onPilih: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPilih}
      className="grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-rule px-3.5 py-2.5 text-left font-semibold transition-colors duration-150 ease-out first:border-t-0 hover:bg-active focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-warga sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)_auto_auto]"
    >
      <span>
        <span
          className="rounded-[3px] px-1.5 py-px text-[13px] font-bold text-hitam"
          style={{ backgroundColor: warna }}
        >
          {label}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="hidden h-2.5 overflow-hidden rounded-[3px] bg-track sm:block"
      >
        <span
          className="block h-full"
          style={{ width: `${maks > 0 ? (jumlah / maks) * 100 : 0}%`, backgroundColor: warna }}
        />
      </span>
      <span className="text-lg font-bold tabular-nums">{formatAngka(jumlah)}</span>
      <span aria-hidden="true" className="text-muted">
        ›
      </span>
    </button>
  );
}

/**
 * Tab penyaring hasil MusrenAI: ringkas (36px) tetapi tetap nyaman ditekan, karena area
 * sentuhnya diperluas ke 44px lewat lapisan tak terlihat di sekelilingnya.
 */
const kelasChip = (aktif: boolean) =>
  cn(
    "relative inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold transition-colors duration-150 ease-out after:absolute after:-inset-1 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga",
    aktif ? 'border-ink bg-ink text-on-ink' : 'border-border bg-surface text-ink hover:bg-active',
  );

/**
 * Antrean usulan yang belum diputuskan. Satu usulan satu kartu, dengan satu tindakan utama:
 * membuka rinciannya. Keputusan diambil di halaman rincian setelah isinya dibaca, kecuali
 * penolakan massal untuk usulan yang ditandai spam, promosi, atau tidak relevan oleh MusrenAI.
 */
export function AntreanTinjau({ proposals }: { proposals: Proposal[] }) {
  const [cari, setCari] = useState('');
  const [kategori, setKategori] = useState('semua');
  const [urutan, setUrutan] = useState<Urutan>('terlama');
  const [saringAi, setSaringAi] = useState<SaringAi>('semua');
  const [tolakFlag, setTolakFlag] = useState<FlagAi | null>(null);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [sedangTolak, setSedangTolak] = useState(false);
  const [proses, setProses] = useState<{ sekarang: number; total: number; id: number } | null>(
    null,
  );
  const [galat, setGalat] = useState<string | null>(null);
  const [halaman, setHalaman] = useState(1);
  const [pratinjau, setPratinjau] = useState<Proposal | null>(null);
  const jumlahKomentar = useCommentCountsQuery().data ?? {};
  const queryClient = useQueryClient();
  const moderasi = useModerateProposalMutation();

  const daftarKategori = useMemo(
    () =>
      [...new Set(proposals.map((proposal) => proposal.kategori))].sort((a, b) =>
        a.localeCompare(b, 'id'),
      ),
    [proposals],
  );

  const tersaring = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    const waktu = (proposal: Proposal) => new Date(proposal.dibuat_pada).getTime();
    const komentar = (proposal: Proposal) => jumlahKomentar[proposal.id] ?? 0;
    const pembanding: Record<Urutan, (a: Proposal, b: Proposal) => number> = {
      terlama: (a, b) => waktu(a) - waktu(b),
      terbaru: (a, b) => waktu(b) - waktu(a),
      suara: (a, b) => b.jumlah_suara - a.jumlah_suara || waktu(a) - waktu(b),
      komentar: (a, b) => komentar(b) - komentar(a) || waktu(a) - waktu(b),
    };

    return proposals
      .filter((proposal) => kategori === 'semua' || proposal.kategori === kategori)
      .filter(
        (proposal) =>
          kunci.length === 0 ||
          proposal.judul.toLowerCase().includes(kunci) ||
          proposal.pengusul_nama.toLowerCase().includes(kunci) ||
          proposal.lokasi?.toLowerCase().includes(kunci),
      )
      .sort(pembanding[urutan]);
  }, [proposals, cari, kategori, urutan, jumlahKomentar]);

  // Hasil review dimuat untuk semua usulan di antrean ini, supaya penyaring per indikasi
  // dan ringkasan AI bekerja pada seluruh daftar, bukan hanya 20 teratas.
  const ulasan = useQueries({
    queries: proposals.map((proposal) => ({
      queryKey: ['admin', 'ai-review', proposal.id] as const,
      queryFn: () => getAiReview(proposal.id),
      retry: false,
      staleTime: 30_000,
    })),
  });
  const hasil = new Map<number, Ulasan>(
    proposals.map((proposal, index) => [proposal.id, ulasan[index]?.data]),
  );
  const queryPer = new Map(proposals.map((proposal, index) => [proposal.id, ulasan[index]]));
  const memuatUlasan = ulasan.some((query) => query.isPending);
  const aiTakTersedia = ulasan.length > 0 && ulasan.every((query) => query.isError);
  const sudahDianalisis = proposals.filter(
    (proposal) => hasil.get(proposal.id)?.state === 'completed',
  ).length;
  const semuaDiperiksa = proposals.length > 0 && sudahDianalisis === proposals.length;
  const daftarAman = tersaring.filter((proposal) => aman(hasil.get(proposal.id)));
  const daftarPerFlag = (flag: FlagAi) =>
    tersaring.filter((proposal) => {
      const item = hasil.get(proposal.id);
      return item?.state === 'completed' && item.flags.includes(flag);
    });
  const tampil =
    saringAi === 'aman' ? daftarAman : saringAi === 'semua' ? tersaring : daftarPerFlag(saringAi);

  // Pagination antrean: kembali ke halaman pertama setiap penyaring berubah.
  useEffect(() => {
    setHalaman(1);
  }, [cari, kategori, urutan, saringAi]);
  const totalHalaman = Math.max(1, Math.ceil(tampil.length / KARTU_PER_HALAMAN));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const tampilHalaman = tampil.slice(
    (halamanAktif - 1) * KARTU_PER_HALAMAN,
    halamanAktif * KARTU_PER_HALAMAN,
  );

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    perFlag: Record<FlagAi, Proposal[]>;
    aman: Proposal[];
    gagal: Proposal[];
    belumDiperiksa: number;
  } | null>(null);
  const [frasaIdx, setFrasaIdx] = useState(0);

  // Frasa pemuat bergantian selama analisis berjalan.
  useEffect(() => {
    if (!proses) return;
    const timer = setInterval(() => setFrasaIdx((idx) => (idx + 1) % FRASA_MUAT.length), 1600);
    return () => clearInterval(timer);
  }, [proses]);

  const resetSaring = () => {
    setCari('');
    setKategori('semua');
    setUrutan('terlama');
    setSaringAi('semua');
    setHalaman(1);
  };

  /**
   * Summary AI: memeriksa semua usulan yang belum selesai dianalisis, satu per satu sesuai
   * kuota bersama, lalu membuka ringkasan per indikasi. Gagal di satu usulan tidak menghentikan
   * sisanya; kuota habis means semua sisanya dicatat sebagai gagal di ringkasan.
   */
  const buatSummaryAi = async () => {
    setSummaryData(null);
    setSummaryOpen(true);
    const targets = proposals.filter((proposal) => {
      const item = hasil.get(proposal.id);
      return !item || item.state !== 'completed';
    });
    setGalat(null);
    for (let index = 0; index < targets.length; index += 1) {
      const proposal = targets[index]!;
      setProses({ sekarang: index + 1, total: targets.length, id: proposal.id });
      try {
        await analyzeProposal(proposal.id);
        await queryClient.invalidateQueries({
          queryKey: ['admin', 'ai-review', proposal.id],
        });
      } catch {
        // Gagal di satu usulan (mis. kuota habis) dicatat; lanjut ke berikutnya.
      }
      // Jeda antar percobaan supaya tidak menabrak batas 10 percobaan per menit.
      if (index < targets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, JEDA_KUOTA_MS));
      }
    }
    setProses(null);
    // Baca ulang hasil per usulan supaya ringkasan memakai data terbaru.
    const perFlag: Record<FlagAi, Proposal[]> = {
      spam: [],
      promotion: [],
      irrelevant: [],
      needs_review: [],
    };
    const amanList: Proposal[] = [];
    const gagalList: Proposal[] = [];
    let belumDiperiksa = 0;
    for (const proposal of proposals) {
      try {
        const review = await queryClient.fetchQuery({
          queryKey: ['admin', 'ai-review', proposal.id],
          queryFn: () => getAiReview(proposal.id),
          staleTime: 0,
        });
        if (review?.state === 'completed') {
          if (review.flags.length === 0) amanList.push(proposal);
          else {
            for (const flag of review.flags) {
              if (flag in perFlag) perFlag[flag as FlagAi].push(proposal);
            }
          }
        } else if (review?.state === 'failed') {
          gagalList.push(proposal);
          belumDiperiksa += 1;
        } else {
          belumDiperiksa += 1;
        }
      } catch {
        gagalList.push(proposal);
        belumDiperiksa += 1;
      }
    }
    setSummaryData({ perFlag, aman: amanList, gagal: gagalList, belumDiperiksa });
  };

  const daftarTolak = tolakFlag ? daftarPerFlag(tolakFlag) : [];

  const bukaTolak = (flag: FlagAi) => {
    setAlasanTolak(alasanBawaan(flag));
    setTolakFlag(flag);
  };

  const tolakSemua = async () => {
    const catatan = alasanTolak.trim();
    if (!tolakFlag || catatan.length === 0) return;
    const sasaran = daftarTolak;
    setTolakFlag(null);
    setSedangTolak(true);
    let berhasil = 0;
    try {
      for (const proposal of sasaran) {
        await moderasi.mutateAsync({ proposalId: proposal.id, moderasi: 'Ditolak', catatan });
        berhasil += 1;
      }
      toast.success(`${berhasil} usulan ditolak dengan alasan tercatat.`);
    } catch (error) {
      toast.error(
        `${berhasil} dari ${sasaran.length} usulan ditolak. ${
          error instanceof Error ? error.message : ''
        }`.trim(),
      );
    } finally {
      setSedangTolak(false);
    }
  };

  if (proposals.length === 0) {
    return (
      <EmptyState
        title="Tidak ada usulan yang menunggu"
        description="Usulan baru akan muncul di sini setelah warga mengirimkannya. Kamu bisa melihat usulan yang sudah diputuskan di halaman Semua usulan."
        action={
          <Link to="/admin/usulan" className={buttonClass('outline', 'md')}>
            Lihat semua usulan
          </Link>
        }
      />
    );
  }

  const adaSaring = cari.trim().length > 0 || kategori !== 'semua' || saringAi !== 'semua';

  return (
    <>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cari usulan" htmlFor="cari-antrean" className="sm:col-span-2">
            <Input
              id="cari-antrean"
              type="search"
              value={cari}
              onChange={(event) => setCari(event.target.value)}
              placeholder="Judul, pengusul, atau lokasi"
            />
          </Field>
          <Field label="Kategori" htmlFor="kategori-antrean">
            <Select
              id="kategori-antrean"
              value={kategori}
              onChange={(event) => setKategori(event.target.value)}
            >
              <option value="semua">Semua kategori</option>
              {daftarKategori.map((nama) => (
                <option key={nama} value={nama}>
                  {nama}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Urutkan" htmlFor="urutan-antrean">
            <Select
              id="urutan-antrean"
              value={urutan}
              onChange={(event) => setUrutan(event.target.value as Urutan)}
            >
              {PILIHAN_URUTAN.map((pilihan) => (
                <option key={pilihan.nilai} value={pilihan.nilai}>
                  {pilihan.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {proposals.length > 0 && (
          <section
            aria-labelledby="judul-bantuan-musrenai"
            className="mt-5 rounded-2xl border border-border bg-active/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="min-w-0">
                <h2 id="judul-bantuan-musrenai" className="text-[15px] font-bold">
                  Bantuan MusrenAI
                </h2>
                <p className="mt-0.5 max-w-[65ch] text-[13px] leading-relaxed text-muted">
                  Summary AI memeriksa semua usulan yang belum dianalisis, satu per satu sesuai
                  kuota bersama. Hasilnya hanya saran.
                </p>
              </div>
              {!aiTakTersedia && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={proses !== null}
                  disabled={proses !== null || memuatUlasan}
                  onClick={() => void buatSummaryAi()}
                >
                  <BintangAi jalan={proses !== null} />
                  {proses ? `Memeriksa ${proses.sekarang} dari ${proses.total}` : 'Summary AI'}
                </Button>
              )}
            </div>

            {aiTakTersedia && (
              <p role="alert" className="mt-3 rounded-xl bg-surface px-3.5 py-2.5 text-sm">
                MusrenAI belum bisa dihubungi. Kamu tetap bisa membuka dan memeriksa usulan satu per
                satu.
              </p>
            )}

            {proses && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <BintangAi jalan />
                  <p aria-live="polite" className="teks-muat text-sm font-semibold text-ink">
                    {FRASA_MUAT[frasaIdx]}
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-label="Kemajuan pemeriksaan MusrenAI"
                  aria-valuemin={0}
                  aria-valuemax={proses.total}
                  aria-valuenow={proses.sekarang - 1}
                  className="h-2 overflow-hidden rounded-full bg-track"
                >
                  <i
                    className="block h-full origin-left rounded-full bg-hijau-terang transition-transform duration-300 ease-out"
                    style={{ transform: `scaleX(${(proses.sekarang - 1) / proses.total})` }}
                  />
                </div>
              </div>
            )}

            {galat && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {galat}
              </p>
            )}

            {!aiTakTersedia && (
              <>
                <div
                  role="group"
                  aria-label="Saring menurut hasil MusrenAI"
                  className="mt-2.5 flex flex-wrap gap-1.5"
                >
                  {(
                    [
                      ['semua', 'Semua', tersaring.length],
                      ['aman', 'Tanpa indikasi', daftarAman.length],
                      ['spam', 'Spam', daftarPerFlag('spam').length],
                      ['promotion', 'Promosi', daftarPerFlag('promotion').length],
                      ['irrelevant', 'Tidak relevan', daftarPerFlag('irrelevant').length],
                      ['needs_review', 'Perlu ditinjau', daftarPerFlag('needs_review').length],
                    ] as const
                  ).map(([nilai, label, jumlah]) => (
                    <button
                      key={nilai}
                      type="button"
                      aria-pressed={saringAi === nilai}
                      onClick={() => setSaringAi(nilai)}
                      className={kelasChip(saringAi === nilai)}
                    >
                      {label}
                      <span className="text-[11px] font-bold tabular-nums opacity-70">
                        {jumlah}
                      </span>
                    </button>
                  ))}
                </div>

                {FLAGS_TOLAK.some((flag) => daftarPerFlag(flag).length > 0) && (
                  <div
                    role="group"
                    aria-label="Tolak cepat usulan berindikasi"
                    className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"
                  >
                    <span className="mr-1 text-[13px] font-bold">Tolak cepat</span>
                    {FLAGS_TOLAK.map((flag) => {
                      const jumlah = daftarPerFlag(flag).length;
                      if (jumlah === 0) return null;
                      return (
                        <button
                          key={flag}
                          type="button"
                          disabled={sedangTolak}
                          onClick={() => bukaTolak(flag)}
                          className="group inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] border-ink bg-surface px-3 text-[13px] font-semibold text-ink transition-colors duration-150 ease-out hover:border-[#b42318] hover:bg-[#fbeae8] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                        >
                          <span className="text-[#b42318] transition-transform duration-150 ease-out group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover:rotate-0">
                            <Icon name="sampah" size={17} />
                          </span>
                          {LABEL_INDIKASI[flag]}
                          <span className="font-semibold text-muted tabular-nums">{jumlah}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-start gap-x-3 gap-y-2 rounded-2xl border-[1.5px] border-ink bg-surface px-3.5 py-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-6 flex-none place-items-center rounded-full text-sm font-extrabold text-white',
                      semuaDiperiksa ? 'bg-warga' : 'bg-ink',
                    )}
                  >
                    {semuaDiperiksa ? '✓' : '!'}
                  </span>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-[15px] leading-snug font-extrabold">
                      {semuaDiperiksa
                        ? `Semua ${formatAngka(proposals.length)} usulan sudah diperiksa MusrenAI`
                        : `${formatAngka(sudahDianalisis)} dari ${formatAngka(proposals.length)} usulan sudah diperiksa`}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {!semuaDiperiksa && 'Jalankan Summary AI untuk memeriksa sisanya. '}
                      MusrenAI bisa keliru, jadi tetap lihat isi usulan sebelum memutuskan.
                    </p>
                  </div>
                  {!semuaDiperiksa && proses === null && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={memuatUlasan}
                      onClick={() => void buatSummaryAi()}
                    >
                      Periksa sisanya
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        <p aria-live="polite" className="mt-4 text-sm text-muted">
          Menampilkan {formatAngka(tampil.length)} dari {formatAngka(proposals.length)} usulan yang
          menunggu.
        </p>

        {tampil.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={
                saringAi === 'aman'
                  ? 'Belum ada usulan tanpa indikasi'
                  : saringAi !== 'semua'
                    ? `Belum ada usulan dengan indikasi ${LABEL_INDIKASI[saringAi]}`
                    : 'Tidak ada usulan yang cocok'
              }
              description={
                saringAi !== 'semua'
                  ? 'Jalankan Summary AI dulu, atau pilih Semua untuk melihat seluruh antrean.'
                  : 'Ubah kata kunci, kategori, atau saringan hasil MusrenAI.'
              }
              action={
                adaSaring ? (
                  <Button type="button" variant="outline" onClick={resetSaring}>
                    Hapus filter
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {tampilHalaman.map((proposal) => {
              const hari = umurHari(proposal.dibuat_pada);
              const item = hasil.get(proposal.id);
              return (
                <li key={proposal.id}>
                  <button
                    type="button"
                    onClick={() => setPratinjau(proposal)}
                    className="kartu-cap group block w-full cursor-pointer rounded-2xl bg-surface px-3.5 py-3 text-left transition-colors duration-150 ease-out hover:bg-active/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga sm:px-4"
                  >
                    <div className="flex items-start gap-3">
                      <CategoryTile kategori={proposal.kategori} small />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                          <p className="min-w-0 text-[15.5px] leading-snug font-bold text-ink [overflow-wrap:anywhere]">
                            {proposal.judul}
                          </p>
                          <span
                            aria-hidden="true"
                            className="inline-flex min-h-11 flex-none items-center rounded-xl bg-ink px-4 text-sm font-semibold text-on-ink transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                          >
                            Periksa
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-muted [overflow-wrap:anywhere]">
                          {proposal.kategori} · oleh {proposal.pengusul_nama}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted">
                          <span>
                            Masuk {formatTanggal(proposal.dibuat_pada)}
                            {hari === 0 ? ', hari ini' : `, ${hari} hari menunggu`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatAngka(proposal.jumlah_suara)} dukungan</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatAngka(jumlahKomentar[proposal.id] ?? 0)} komentar</span>
                          <ChipAi
                            ulasan={item}
                            sedang={proses?.id === proposal.id}
                            memuat={queryPer.get(proposal.id)?.isPending ?? false}
                            galat={queryPer.get(proposal.id)?.isError ?? false}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {tampil.length > 0 && (
          <div className="mt-4">
            <Pagination
              halaman={halamanAktif}
              totalHalaman={totalHalaman}
              onHalaman={setHalaman}
              label="Halaman antrean tinjau"
            />
          </div>
        )}
      </Card>

      {pratinjau && <PreviewUsulan proposal={pratinjau} onClose={() => setPratinjau(null)} />}

      <Modal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        labelledBy="judul-ringkasan-ai"
        className="w-[min(640px,calc(100vw-24px))]"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <BintangAi />
            <h2 id="judul-ringkasan-ai" className="text-xl font-bold">
              Summary AI
            </h2>
          </div>

          {!summaryData ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <BintangAi jalan={proses !== null} />
                <p aria-live="polite" className="teks-muat text-[15px] font-semibold text-ink">
                  {FRASA_MUAT[frasaIdx]}
                </p>
              </div>
              {proses && (
                <div
                  role="progressbar"
                  aria-label="Kemajuan Summary AI"
                  aria-valuemin={0}
                  aria-valuemax={proses.total}
                  aria-valuenow={proses.sekarang - 1}
                  className="h-2 overflow-hidden rounded-full bg-track"
                >
                  <i
                    className="block h-full origin-left rounded-full bg-hijau-terang transition-transform duration-300 ease-out"
                    style={{ transform: `scaleX(${(proses.sekarang - 1) / proses.total})` }}
                  />
                </div>
              )}
              <p className="text-sm text-muted">
                MusrenAI memeriksa setiap usulan satu per satu sesuai kuota bersama, jadi proses ini
                bisa memakan waktu. Kamu boleh menutup pop-up ini; pemeriksaan tetap berjalan di
                belakangnya.
              </p>
            </div>
          ) : (
            <>
              {(() => {
                // Satu usulan bisa punya beberapa label, jadi "dengan indikasi" dihitung per usulan,
                // bukan dijumlahkan per label.
                const idBerindikasi = new Set(
                  FLAGS_AI.flatMap((flag) => summaryData.perFlag[flag].map((item) => item.id)),
                );
                const jumlahAman = summaryData.aman.length;
                const jumlahIndikasi = idBerindikasi.size;
                const totalBatang = jumlahAman + jumlahIndikasi;
                const maks = Math.max(
                  jumlahAman,
                  ...FLAGS_AI.map((flag) => summaryData.perFlag[flag].length),
                );
                const pilih = (saring: SaringAi) => {
                  setSaringAi(saring);
                  setSummaryOpen(false);
                };
                return (
                  <>
                    <p className="mt-2 text-sm text-muted">
                      Dari <b className="text-ink">{formatAngka(proposals.length)} usulan</b> yang
                      menunggu, <b className="text-ink">{formatAngka(jumlahAman)}</b> tanpa indikasi
                      dan <b className="text-ink">{formatAngka(jumlahIndikasi)}</b> dengan indikasi.
                      {summaryData.belumDiperiksa > 0 &&
                        ` ${formatAngka(summaryData.belumDiperiksa)} belum terperiksa.`}{' '}
                      MusrenAI bisa keliru, jadi tetap lihat isi usulan sebelum memutuskan.
                    </p>

                    {totalBatang > 0 && (
                      <div className="mt-4" aria-hidden="true">
                        <div className="flex h-4 gap-0.5 overflow-hidden rounded bg-track">
                          <i
                            className="block h-full"
                            style={{
                              width: `${(jumlahAman / totalBatang) * 100}%`,
                              backgroundColor: WARNA_AMAN,
                            }}
                          />
                          <i
                            className="block h-full"
                            style={{
                              width: `${(jumlahIndikasi / totalBatang) * 100}%`,
                              backgroundColor: WARNA_FLAG.spam,
                            }}
                          />
                        </div>
                        <div className="mt-1.5 flex justify-between text-[13px] text-muted">
                          <span>{formatAngka(jumlahAman)} tanpa indikasi</span>
                          <span>{formatAngka(jumlahIndikasi)} dengan indikasi</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 overflow-hidden rounded-[14px] border-[1.5px] border-ink">
                      <BarisRingkasan
                        warna={WARNA_AMAN}
                        label="Tanpa indikasi"
                        jumlah={jumlahAman}
                        maks={maks}
                        onPilih={() => pilih('aman')}
                      />
                      {FLAGS_AI.map((flag) => (
                        <BarisRingkasan
                          key={flag}
                          warna={WARNA_FLAG[flag]}
                          label={LABEL_INDIKASI[flag]}
                          jumlah={summaryData.perFlag[flag].length}
                          maks={maks}
                          onPilih={() => pilih(flag)}
                        />
                      ))}
                    </div>
                    {summaryData.gagal.length > 0 && (
                      <p className="mt-2 text-[13px] text-muted">
                        {formatAngka(summaryData.gagal.length)} usulan gagal diperiksa. Jalankan
                        Summary AI lagi untuk mencobanya ulang.
                      </p>
                    )}
                  </>
                );
              })()}

              <div className="mt-5 flex flex-wrap justify-end gap-2.5">
                <Button type="button" variant="ghost" onClick={() => setSummaryOpen(false)}>
                  Tutup
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={tolakFlag !== null}
        onClose={() => setTolakFlag(null)}
        labelledBy="judul-tolak-semua"
        className="w-[min(560px,calc(100vw-24px))]"
      >
        <div className="p-5 sm:p-6">
          <h2 id="judul-tolak-semua" className="text-xl font-bold">
            Tolak {daftarTolak.length} usulan sekaligus?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Usulan di bawah ini ditandai MusrenAI
            {tolakFlag ? ` sebagai ${LABEL_INDIKASI[tolakFlag].toLowerCase()}` : ''}. MusrenAI bisa
            keliru, jadi lihat daftarnya dulu. Pengusul akan melihat alasan penolakan.
          </p>
          <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
            {daftarTolak.map((proposal) => (
              <li key={proposal.id} className="[overflow-wrap:anywhere]">
                {proposal.judul}
              </li>
            ))}
          </ul>
          <Field label="Alasan penolakan" htmlFor="alasan-tolak-semua" required className="mt-4">
            <Textarea
              id="alasan-tolak-semua"
              rows={2}
              value={alasanTolak}
              onChange={(event) => setAlasanTolak(event.target.value)}
              maxLength={2000}
            />
          </Field>
          <div className="mt-5 flex flex-wrap justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={() => setTolakFlag(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={alasanTolak.trim().length === 0 || daftarTolak.length === 0}
              onClick={() => void tolakSemua()}
            >
              Tolak {daftarTolak.length} usulan
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
