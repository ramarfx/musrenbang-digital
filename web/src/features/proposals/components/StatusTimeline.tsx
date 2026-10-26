import { PROPOSAL_STATUSES, type ProposalStatus, type StatusHistory } from '@musrenbang/shared';
import { formatTanggalWaktu } from '@/lib/format';

type StatusTimelineProps = {
  status: ProposalStatus;
  history: StatusHistory[];
};

export function StatusTimeline({ status, history }: StatusTimelineProps) {
  const currentIndex = PROPOSAL_STATUSES.indexOf(status);

  return (
    <ol className="space-y-0">
      {PROPOSAL_STATUSES.map((step, index) => {
        const done = index <= currentIndex;
        const entry = [...history].reverse().find((item) => item.status_baru === step);
        return (
          <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
            {index < PROPOSAL_STATUSES.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-6 left-3 h-full w-0.5 ${done ? 'bg-emerald-700' : 'bg-stone-200'}`}
              />
            )}
            <span
              className={`relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? 'bg-emerald-800 text-white'
                  : 'border border-stone-300 bg-white text-stone-400'
              }`}
            >
              {index + 1}
            </span>
            <div>
              <p className={`text-sm font-semibold ${done ? 'text-stone-900' : 'text-stone-400'}`}>
                {step}
              </p>
              {entry ? (
                <p className="text-xs text-stone-500">
                  {formatTanggalWaktu(entry.diubah_pada)} · {entry.diubah_oleh_nama ?? 'Sistem'}
                </p>
              ) : (
                <p className="text-xs text-stone-400">
                  {done ? 'Tahap ini sudah dilalui' : 'Belum tercapai'}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
