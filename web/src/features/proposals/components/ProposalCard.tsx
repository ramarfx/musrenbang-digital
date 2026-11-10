import { PROPOSAL_STATUSES, type Proposal, type ProposalStatus } from '@musrenbang/shared';
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useCommentCountsQuery } from '@/features/comments/queries';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { FotoMini } from '@/features/photos/components/FotoMini';
import { useFotoPerUsulan } from '@/features/photos/queries';
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
export function TahapMini({ tahap, ditolak }: { tahap: number; ditolak?: boolean }) {
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
                'kartu-ikon mb-1.5 size-[18px]',
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
                  className="absolute top-1/2 left-1/2 h-0.5 w-full -translate-y-1/2 overflow-hidden rounded-full bg-track"
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
                  'relative z-10 grid size-[22px] place-items-center rounded-full text-[11px] font-bold',
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
                  <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true">
                    <path
                      d="m4.5 4.5 7 7m0-7-7 7"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : lewat || (kini && index === terakhir) ? (
                  <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true">
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
                'mt-1.5 max-w-full truncate px-0.5 text-[11px] sm:text-xs',
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
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { user } = useAuth();
  const [ref, tampak] = useMasukTerlihat<HTMLElement>(0.15);
  const [keluar, setKeluar] = useState(false);
  const milikku = user !== null && proposal.pengusul_id === user.id;
  const punyaAksi = milikku && (bisaDiubah(proposal) || bisaDihapus(proposal));
  const keadaan = keadaanUsulan(proposal);
  const jumlahKomentar = useCommentCountsQuery().data?.[proposal.id] ?? 0;
  const fotoPengerjaan = useFotoPerUsulan().get(proposal.id) ?? [];

  return (
    <article
      ref={ref}
      data-keluar={keluar || undefined}
      className={cn(
        'kartu-usulan group relative flex h-full flex-col rounded-3xl border-[1.5px] border-edge bg-surface p-4 shadow-[0_4px_0_var(--edge)] hover:-translate-y-0.5 sm:p-5',
        tampak && 'kartu-tampak',
      )}
    >
      {milikku && <TandaTayang moderasi={proposal.moderasi} />}

      <div className="flex items-center gap-3">
        <CategoryTile kategori={proposal.kategori} />
        <div className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2lh] leading-snug font-bold [overflow-wrap:anywhere] text-ink transition-colors duration-150 group-hover:text-warga sm:text-[17px]">
            <Link
              to={`/usulan/${proposal.id}`}
              className="after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-warga"
            >
              {proposal.judul}
            </Link>
          </h3>
          <p className="text-[13px] text-muted">{proposal.kategori}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2lh] text-sm text-ink/80 [overflow-wrap:anywhere]">
        {proposal.deskripsi}
      </p>

      <div className="mt-3.5 flex h-6 min-w-0 items-center gap-2">
        <span
          className={cn(
            'kartu-label inline-flex flex-none items-center gap-1.5 text-[13px] font-bold',
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
        <span aria-hidden="true" className="h-3.5 w-px flex-none bg-border" />
        <span className="truncate text-[12.5px] text-muted" title={keadaan.kalimat}>
          {keadaan.kalimat}
        </span>
      </div>

      <div className="mt-3">
        <TahapMini tahap={keadaan.tahap} ditolak={keadaan.ditolak} />
      </div>

      <FotoMini photos={fotoPengerjaan} />

      <div className="mt-auto">
        <dl className="mt-3.5 grid grid-cols-2 gap-3 border-t border-rule pt-3 text-sm">
          <div>
            <dt className="text-[12px] text-muted">Estimasi</dt>
            <dd className="font-bold">{formatRupiahRingkas(proposal.estimasi_biaya)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-[12px] text-muted">Diajukan</dt>
            <dd className="font-bold">{formatTanggal(proposal.dibuat_pada)}</dd>
          </div>
        </dl>

        <div className="relative z-10 mt-3 flex min-h-9 flex-wrap items-center gap-2">
          {proposal.moderasi === 'Disetujui' ? (
            <>
              <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} />
              <Link
                to={`/usulan/${proposal.id}#komentar`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
              >
                <Icon name="usulan" size={16} />
                Komentar
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
          <span className="ml-auto text-[12.5px] text-muted">oleh {proposal.pengusul_nama}</span>
        </div>
      </div>
    </article>
  );
}
