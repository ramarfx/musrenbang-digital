import { PROPOSAL_STATUSES, type ProposalStatus } from '@musrenbang/shared';
import { cn } from '@/lib/cn';

/**
 * Lima ruas tahap usulan. Teks tahap ditulis lengkap supaya admin awam tidak perlu menebak
 * arti warna, dan pembaca layar tetap mendapat keterangan yang sama.
 */
export function KemajuanTahap({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  const tahap = PROPOSAL_STATUSES.indexOf(status);
  const sekarang = tahap < 0 ? 0 : tahap;

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex gap-1" aria-hidden="true">
        {PROPOSAL_STATUSES.map((nama, index) => (
          <span
            key={nama}
            className={cn(
              'h-2 flex-1 rounded-full',
              index <= sekarang ? 'bg-hijau-terang' : 'bg-track',
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-sm text-muted">
        Tahap {sekarang + 1} dari {PROPOSAL_STATUSES.length}: {status}
      </p>
    </div>
  );
}
