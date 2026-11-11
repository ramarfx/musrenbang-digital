import { PROPOSAL_STATUSES, type Proposal, type ProposalStatus } from '@musrenbang/shared';
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useCommentCountsQuery } from '@/features/comments/queries';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { cn } from '@/lib/cn';
import { formatRupiahRingkas, formatTanggal } from '@/lib/format';
import { useMasukTerlihat } from '@/lib/reveal';
import { AksiPemilik, bisaDihapus, bisaDiubah } from './AksiPemilik';
import { IKON_TAHAP } from './StatusTimeline';
import { UpvoteButton } from './UpvoteButton';

type Keadaan = {
  /** Teks status berwarna (tanpa alas), dengan ikon garis 24px di depannya. */
  label: string;
  ikon: string;
  /** Ditolak: ikon status dan bulatan tahap pertama bergoyang sekali saat kartu muncul. */
  ditolak?: boolean;
  warnaTeks: string;
  kalimat: string;
  /** Indeks tahap sekarang. Menunggu dan ditolak masih di tahap pertama (Diajukan). */
  tahap: number;
};

const KALIMAT: Record<ProposalStatus, string> = {
  Diajukan: 'Sudah tampil untuk umum dan bisa didukung warga.',
  Diverifikasi: 'Admin menilai usulan ini layak dibahas.',
  'Masuk APBD': 'Masuk daftar program anggaran daerah.',
  Dikerjakan: 'Programnya sedang dikerjakan di lapangan.',
  Selesai: 'Programnya sudah selesai dikerjakan.',
};

function keadaanUsulan(proposal: Proposal): Keadaan {
  if (proposal.moderasi === 'Menunggu') {
    return {
      label: 'Menunggu admin',
      ikon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
      warnaTeks: 'text-mustard-tua',
      kalimat: 'Tampil untuk umum setelah disetujui admin.',
      tahap: 0,
    };
  }
  if (proposal.moderasi === 'Ditolak') {
    return {
      label: 'Ditolak',
      ikon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6',
      ditolak: true,
      warnaTeks: 'text-red-700',
      kalimat: proposal.catatan_moderasi
        ? `Catatan admin: ${proposal.catatan_moderasi}`
        : 'Admin belum bisa menyetujui usulan ini.',
      tahap: 0,
    };
  }
  const tahap = Math.max(0, PROPOSAL_STATUSES.indexOf(proposal.status as ProposalStatus));
  const status = PROPOSAL_STATUSES[tahap] ?? 'Diajukan';
  const selesai = tahap === PROPOSAL_STATUSES.length - 1;
  return {
    label: selesai ? 'Selesai' : `Tahap ${tahap + 1} dari ${PROPOSAL_STATUSES.length}`,
    ikon: IKON_TAHAP[status],
    warnaTeks: 'text-warga',
    kalimat: KALIMAT[status],
    tahap,
  };
}

/**
 * Tanda apakah usulan sudah tayang untuk umum, hanya di kartu milik sendiri (kartu usulan
 * orang lain di daftar publik pasti sudah tayang). Mata terbuka = terlihat publik, mata dicoret
 * = belum atau tidak. Teks polos berikon, tanpa kapsul berwarna.
 */
function TandaTayang({ moderasi }: { moderasi: Proposal['moderasi'] }) {
  const tayang = moderasi === 'Disetujui';
  return (
    <p
      className={cn(
        'mb-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold',
        tayang ? 'text-warga' : moderasi === 'Ditolak' ? 'text-red-700' : 'text-mustard-tua',
      )}
    >
      <Icon name={tayang ? 'mata' : 'mataCoret'} size={15} />
      {tayang ? 'Tayang untuk umum' : moderasi === 'Ditolak' ? 'Tidak tayang' : 'Belum tayang'}
    </p>
  );
}

/**
 * Lima tahap kecil berikon, sama dengan linimasa di halaman detail: ikon di atas bulatan.
 * Tinta dicentang = dilalui, stabilo bercincin = sekarang (berdetak terus sampai tahap
 * Selesai), garis pudar = belum. Ditolak: bulatan pertama merah dengan silang.
 */
export function TahapMini({
  tahap,
  ditolak,
  besar = false,
}: {
  tahap: number;
  ditolak?: boolean;
  /** Ukuran lebih besar, dipakai di kartu usulan supaya tahapnya terbaca sekilas. */
  besar?: boolean;
}) {
  const terakhir = PROPOSAL_STATUSES.length - 1;
  return (
    <ol className="grid grid-cols-5" aria-label="Tahap usulan">
      {PROPOSAL_STATUSES.map((nama, index) => {
        const lewat = index < tahap;
        const kini = index === tahap;
        const gagal = kini && ditolak;
        const berdetak = kini && !gagal && index < terakhir;
        return (
          <li
            key={nama}
            aria-current={kini ? 'step' : undefined}
            className="flex min-w-0 flex-col items-center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ '--urutan': index } as CSSProperties}
              className={cn(
                'kartu-ikon',
                besar ? 'mb-2 size-6' : 'mb-1.5 size-[18px]',
                gagal
                  ? 'text-red-700'
                  : kini
                    ? 'text-warga'
                    : lewat
                      ? 'text-ink'
                      : 'text-muted opacity-50',
              )}
            >
              <path d={IKON_TAHAP[nama]} />
            </svg>
            <span className="relative flex w-full justify-center">
              {index < terakhir && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-1/2 left-1/2 w-full -translate-y-1/2 overflow-hidden rounded-full bg-track',
                    besar ? 'h-[3px]' : 'h-0.5',
                  )}
                >
                  {lewat && (
                    <span
                      className="kartu-ruas block h-full bg-ink"
                      style={{ '--urutan': index } as CSSProperties}
                    />
                  )}
                </span>
              )}
              <span
                style={{ '--urutan': index } as CSSProperties}
                className={cn(
                  'relative z-10 grid place-items-center rounded-full font-bold',
                  besar ? 'size-8 text-sm' : 'size-[22px] text-[11px]',
                  lewat && 'kartu-titik bg-ink text-on-ink',
                  kini &&
                    !gagal &&
                    'kartu-pop bg-hijau-terang text-hitam ring-4 ring-hijau-terang/30',
                  berdetak && 'kartu-detak',
                  gagal && 'kartu-pop kartu-tolak bg-red-600 text-on-ink ring-4 ring-red-200/60',
                  !lewat && !kini && 'border-2 border-track bg-surface text-muted',
                )}
              >
                {berdetak && (
                  <span
                    aria-hidden="true"
                    className="kartu-ring absolute inset-0 -z-10 rounded-full bg-hijau-terang"
                  />
                )}
                {gagal ? (
                  <svg viewBox="0 0 16 16" className={besar ? 'size-4' : 'size-3'} fill="none" aria-hidden="true">
                    <path
                      d="m4.5 4.5 7 7m0-7-7 7"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : lewat || (kini && index === terakhir) ? (
                  <svg viewBox="0 0 16 16" className={besar ? 'size-4' : 'size-3'} fill="none" aria-hidden="true">
                    <path
                      d="m3.5 8.5 3 3 6-7"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
            </span>
            <span
              className={cn(
                'max-w-full truncate px-0.5',
                besar ? 'mt-2 -mx-1 text-[11px] sm:text-[11.5px] min-[1280px]:text-[13px]' : 'mt-1.5 text-[11px] sm:text-xs',
                gagal
                  ? 'font-bold text-red-700'
                  : kini
                    ? 'font-bold text-ink'
                    : lewat
                      ? 'font-semibold text-ink'
                      : 'text-muted',
              )}
            >
              {nama}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Kartu usulan ringkas. Judul adalah tautan yang meluas ke seluruh kartu (`after:inset-0`);
 * tombol dukung, komentar, ubah, dan hapus berada di atasnya (`z-10`). Semua keadaan memakai
 * susunan dan tinggi yang sama: satu baris status (ikon, teks berwarna, kalimat; catatan
 * penolakan dipotong), lalu lima tahap kecil berikon. Kartu memudar naik sekali saat pertama terlihat,
 * lalu label, ikon, garis, dan bulatan tahap menyusul (kelas `kartu-*` di index.css).
 */
export function ProposalCard({
  proposal,
  turDukung,
  daftar = false,
}: {
  proposal: Proposal;
  turDukung?: string;
  /** Tampilan daftar: satu baris per usulan, bukan kartu. */
  daftar?: boolean;
}) {
  const { user } = useAuth();
  const [ref, tampak] = useMasukTerlihat<HTMLElement>(0.15);
  const [keluar, setKeluar] = useState(false);
  const milikku = user !== null && proposal.pengusul_id === user.id;
  const punyaAksi = milikku && (bisaDiubah(proposal) || bisaDihapus(proposal));
  const keadaan = keadaanUsulan(proposal);
  // Usulan milikku yang belum tayang: bingkai putus-putus di alas pudar, tanpa bayangan tebal.
  const belumTayang = proposal.moderasi !== 'Disetujui';
  const jumlahKomentar = useCommentCountsQuery().data?.[proposal.id] ?? 0;

  if (daftar) {
    return (
      <article
        ref={ref}
        data-keluar={keluar || undefined}
        className={cn(
          'kartu-usulan group relative flex min-w-0 items-center gap-3 rounded-2xl border-[1.5px] border-edge p-3 hover:-translate-y-0.5 sm:gap-4 sm:p-4',
          belumTayang
            ? 'border-dashed bg-ground'
            : 'bg-surface shadow-[0_3px_0_var(--edge)]',
          tampak && 'kartu-tampak',
        )}
      >
        <div className="flex-none max-sm:[&>span]:size-9 max-sm:[&>span]:rounded-[10px]">
          <CategoryTile kategori={proposal.kategori} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[14px] leading-snug font-bold text-ink transition-colors duration-150 [overflow-wrap:break-word] group-hover:text-warga sm:text-[16px]">
            <Link
              to={`/usulan/${proposal.id}`}
              className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-warga"
            >
              {proposal.judul}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {proposal.kategori}
            <span className="max-sm:hidden"> · oleh {proposal.pengusul_nama}</span>
          </p>
          <p className={cn('mt-1 flex items-center gap-1.5 text-[12px] font-bold', keadaan.warnaTeks)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-3.5 flex-none"
            >
              <path d={keadaan.ikon} />
            </svg>
            {keadaan.label}
          </p>
        </div>
        <div className="hidden w-[230px] flex-none lg:block xl:w-[280px]">
          <TahapMini tahap={keadaan.tahap} ditolak={keadaan.ditolak} />
        </div>
        <dl className="hidden w-24 flex-none text-right text-sm md:block">
          <dt className="text-[12px] text-muted">Estimasi</dt>
          <dd className="font-bold">{formatRupiahRingkas(proposal.estimasi_biaya)}</dd>
        </dl>
        <div className="relative z-10 flex flex-none items-center gap-1.5">
          {proposal.moderasi === 'Disetujui' ? (
            <>
              <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} tur={turDukung} />
              <Link
                to={`/usulan/${proposal.id}#komentar`}
                aria-label={`${jumlahKomentar} komentar`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 text-[13px] font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] max-sm:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
              >
                <Icon name="usulan" size={16} />
                <span className="rounded-md bg-pasir px-1.5 text-[12px] font-bold tabular-nums">
                  {jumlahKomentar}
                </span>
              </Link>
            </>
          ) : (
            punyaAksi && <AksiPemilik proposal={proposal} onKeluar={setKeluar} />
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      ref={ref}
      data-keluar={keluar || undefined}
      className={cn(
        'kartu-usulan group relative flex h-full min-w-0 flex-col rounded-[18px] border-[1.5px] border-edge p-3 hover:-translate-y-0.5 sm:rounded-3xl sm:p-5',
        belumTayang
          ? 'border-dashed bg-ground'
          : 'bg-surface shadow-[0_3px_0_var(--edge)] sm:shadow-[0_4px_0_var(--edge)]',
        tampak && 'kartu-tampak',
      )}
    >
      {milikku && <TandaTayang moderasi={proposal.moderasi} />}

      {/* HP (dua kolom): ikon dan judul sejajar, rincian disembunyikan; lengkapnya di halaman detail. */}
      <div className="flex items-start gap-2 sm:items-center sm:gap-3 max-sm:[&>span]:size-8 max-sm:[&>span]:rounded-[10px] max-sm:[&_svg]:size-[18px]">
        <CategoryTile kategori={proposal.kategori} />
        <div className="min-w-0">
          <h3 className="line-clamp-3 min-h-[2lh] text-[13px] leading-snug font-bold sm:line-clamp-2 sm:text-base [overflow-wrap:break-word] text-ink transition-colors duration-150 group-hover:text-warga sm:text-[17px]">
            <Link
              to={`/usulan/${proposal.id}`}
              className="after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-warga"
            >
              {proposal.judul}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-[11.5px] text-muted sm:mt-0 sm:text-[13px]">{proposal.kategori}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2lh] text-sm text-ink/80 [overflow-wrap:anywhere] max-sm:hidden">
        {proposal.deskripsi}
      </p>

      <div className="mt-2 flex h-6 min-w-0 items-center gap-2 sm:mt-3.5">
        <span
          className={cn(
            'kartu-label inline-flex min-w-0 items-center gap-1.5 text-[12px] font-bold sm:flex-none sm:text-[13px]',
            keadaan.warnaTeks,
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn('size-4', keadaan.ditolak && 'kartu-tolak')}
          >
            <path d={keadaan.ikon} />
          </svg>
          {keadaan.label}
        </span>
        <span aria-hidden="true" className="hidden h-3.5 w-px flex-none bg-border sm:block" />
        <span className="hidden truncate text-[12.5px] text-muted sm:block" title={keadaan.kalimat}>
          {keadaan.kalimat}
        </span>
      </div>

      <div className="mt-3 hidden sm:block">
        <TahapMini tahap={keadaan.tahap} ditolak={keadaan.ditolak} besar />
      </div>

      <div className="mt-auto">
        <dl className="mt-3.5 hidden grid-cols-2 gap-3 border-t border-rule pt-3 text-sm sm:grid">
          <div>
            <dt className="text-[12px] text-muted">Estimasi</dt>
            <dd className="font-bold">{formatRupiahRingkas(proposal.estimasi_biaya)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-[12px] text-muted">Diajukan</dt>
            <dd className="font-bold">{formatTanggal(proposal.dibuat_pada)}</dd>
          </div>
        </dl>

        <div className="relative z-10 mt-2.5 flex min-h-9 flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
          {proposal.moderasi === 'Disetujui' ? (
            <>
              <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} tur={turDukung} />
              <Link
                to={`/usulan/${proposal.id}#komentar`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 text-[13px] sm:px-3 font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
              >
                <Icon name="usulan" size={16} />
                <span className="sr-only sm:not-sr-only">Komentar</span>
                <span
                  aria-label={`${jumlahKomentar} komentar`}
                  className="rounded-md bg-pasir px-1.5 text-[12px] font-bold tabular-nums"
                >
                  {jumlahKomentar}
                </span>
              </Link>
            </>
          ) : (
            punyaAksi && <AksiPemilik proposal={proposal} onKeluar={setKeluar} />
          )}
          <span className="ml-auto hidden text-[12.5px] text-muted sm:inline">oleh {proposal.pengusul_nama}</span>
        </div>
      </div>
    </article>
  );
}
