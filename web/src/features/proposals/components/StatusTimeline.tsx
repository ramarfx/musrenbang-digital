import { PROPOSAL_STATUSES, type ProposalStatus, type StatusHistory } from '@musrenbang/shared';
import { formatTanggal } from '@/lib/format';

type StatusTimelineProps = {
  status: ProposalStatus;
  history: StatusHistory[];
};

/**
 * Linimasa lima tahap. Lebar sm ke atas: mendatar dengan garis penghubung di antara
 * bulatan. Di HP: menurun. Tahap yang sudah dilalui hijau, tahap sekarang diberi cincin.
 */
export function StatusTimeline({ status, history }: StatusTimelineProps) {
  const currentIndex = PROPOSAL_STATUSES.indexOf(status);

  return (
    <ol className="stagger grid gap-0 sm:grid-cols-5">
      {PROPOSAL_STATUSES.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const entry = [...history].reverse().find((item) => item.status_baru === step);
        return (
          <li
            key={step}
            aria-current={current ? 'step' : undefined}
            className="relative flex gap-3 pb-6 last:pb-0 sm:flex-col sm:items-center sm:gap-3 sm:pb-0 sm:text-center"
          >
            {index < PROPOSAL_STATUSES.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-8 left-4 h-full w-0.5 -translate-x-1/2 sm:top-4 sm:left-1/2 sm:h-0.5 sm:w-full sm:translate-x-0 sm:-translate-y-1/2 ${
                  index < currentIndex ? 'bg-hijau' : 'bg-track'
                }`}
              />
            )}
            <span
              className={`relative z-10 grid size-8 flex-none place-items-center rounded-full text-[13px] font-bold ${
                done ? 'bg-hijau text-white' : 'border border-border bg-surface text-muted'
              } ${current ? 'ring-4 ring-hijau/20' : ''}`}
            >
              {done && !current ? (
                <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                  <path
                    d="m3.5 8.5 3 3 6-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-0 sm:px-1">
              <p className={`text-sm font-semibold ${done ? 'text-ink' : 'text-muted'}`}>{step}</p>
              <p className="text-[12.5px] text-muted">
                {entry
                  ? formatTanggal(entry.diubah_pada)
                  : done
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
