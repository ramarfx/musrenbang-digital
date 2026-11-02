import {
  PROPOSAL_STATUSES,
  type ProposalModeration,
  type ProposalStatus,
  type StatusHistory,
} from '@musrenbang/shared';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { formatTanggal } from '@/lib/format';

type StatusTimelineProps = {
  status: ProposalStatus;
  history: StatusHistory[];
  /** Usulan ditolak: tahap pertama jadi merah dan bergoyang sekali, bukan hijau. */
  moderasi?: ProposalModeration;
};

/** Ikon garis 24px per tahap: amplop, dokumen dicentang, gedung, helm proyek, bendera. */
export const IKON_TAHAP: Record<ProposalStatus, string> = {
  Diajukan: 'M3 6h18v12H3zM3 7l9 6 9-6',
  Diverifikasi: 'M5 3h9l5 5v13H5zM14 3v5h5M9 14l2 2 4-4',
  'Masuk APBD': 'M3 20h18M4 9h16M12 3l8 6H4zM6 9v11M10 9v11M14 9v11M18 9v11',
  Dikerjakan: 'M4 17a8 8 0 0 1 16 0zM2 17h20v3H2zM12 9v4',
  Selesai: 'M5 21V4M5 4h12l-2 4 2 4H5',
};

function Centang({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Silang({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path
        d="m4.5 4.5 7 7m0-7-7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Linimasa lima tahap berikon. Lebar sm ke atas: mendatar, ikon di atas bulatan dan nama
 * tahap di bawahnya. Di HP: menurun. Tahap yang sudah dilalui bertinta dengan centang,
 * tahap sekarang stabilo bercincin dengan ikon zamrud, tahap berikutnya pudar.
 * Saat dibuka: ikon naik bergiliran, garis terisi dari tahap pertama, lalu bulatan tahap
 * sekarang muncul membesar lalu berdetak terus dengan cincin yang memancar, seperti sedang
 * menunggu, sampai tahap Selesai (kelas `tl-*`, index.css).
 * Ditolak: bulatan pertama merah dengan silang dan bergoyang sekali.
 */
export function StatusTimeline({ status, history, moderasi }: StatusTimelineProps) {
  const currentIndex = PROPOSAL_STATUSES.indexOf(status);
  const terakhir = PROPOSAL_STATUSES.length - 1;
  const ditolak = moderasi === 'Ditolak';

  return (
    <ol className="stagger grid gap-0 sm:grid-cols-5">
      {PROPOSAL_STATUSES.map((step, index) => {
        const lewat = index < currentIndex;
        const kini = index === currentIndex;
        const gagal = kini && ditolak;
        const selesai = kini && index === terakhir && !gagal;
        const berdetak = kini && !gagal && !selesai;
        const entry = [...history].reverse().find((item) => item.status_baru === step);
        const urutan = { '--urutan': index } as CSSProperties;
        return (
          <li
            key={step}
            aria-current={kini ? 'step' : undefined}
            className="relative flex items-center gap-3 pb-6 last:pb-0 sm:flex-col sm:gap-2.5 sm:pb-0 sm:text-center"
          >
            {/* Garis ke tahap berikutnya: menurun di HP, mendatar di layar lebar. */}
            {index < terakhir && (
              <span
                aria-hidden="true"
                className="absolute top-9 left-4 h-[calc(100%-1.75rem)] w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-track sm:hidden"
              >
                {lewat && <span className="tl-isi-v block h-full w-full bg-ink" style={urutan} />}
              </span>
            )}

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={urutan}
              className={cn(
                'tl-ikon order-2 size-7 flex-none sm:order-none sm:size-10',
                gagal
                  ? 'text-red-700'
                  : kini
                    ? 'text-warga'
                    : lewat
                      ? 'text-ink'
                      : 'text-muted opacity-50',
              )}
            >
              <path d={IKON_TAHAP[step]} />
            </svg>

            <span className="relative order-1 flex flex-none justify-center sm:order-none sm:w-full">
              {index < terakhir && (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-1/2 hidden h-[3px] w-full -translate-y-1/2 overflow-hidden rounded-full bg-track sm:block"
                >
                  {lewat && <span className="tl-isi-h block h-full w-full bg-ink" style={urutan} />}
                </span>
              )}
              <span
                style={urutan}
                className={cn(
                  'relative z-10 grid size-8 place-items-center rounded-full text-[13px] font-bold',
                  lewat && 'tl-titik bg-ink text-on-ink',
                  kini &&
                    !gagal &&
                    'tl-kini bg-hijau-terang text-hitam ring-4 ring-hijau-terang/30',
                  berdetak && 'tl-detak',
                  gagal && 'tl-kini tl-tolak bg-red-600 text-on-ink ring-4 ring-red-200/60',
                  !lewat && !kini && 'border-2 border-track bg-surface text-muted',
                )}
              >
                {berdetak && (
                  <span
                    aria-hidden="true"
                    className="tl-ring absolute inset-0 -z-10 rounded-full bg-hijau-terang"
                    style={urutan}
                  />
                )}
                {gagal ? (
                  <Silang className="size-4" />
                ) : lewat || selesai ? (
                  <Centang className="size-4" />
                ) : (
                  index + 1
                )}
              </span>
            </span>

            <div className="order-3 min-w-0 sm:order-none sm:px-1">
              <p
                className={cn(
                  'text-sm font-bold',
                  gagal ? 'text-red-700' : kini ? 'text-warga' : lewat ? 'text-ink' : 'text-muted',
                )}
              >
                {step}
              </p>
              <p className="text-[12.5px] text-muted">
                {gagal
                  ? 'Belum disetujui'
                  : entry
                    ? formatTanggal(entry.diubah_pada)
                    : lewat || kini
                      ? 'Sudah dilalui'
                      : 'Belum tercapai'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
