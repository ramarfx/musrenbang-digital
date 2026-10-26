import type { ProposalStatus } from '@musrenbang/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

const tones: Record<ProposalStatus, BadgeTone> = {
  Diajukan: 'neutral',
  Diverifikasi: 'info',
  'Masuk APBD': 'warning',
  Dikerjakan: 'success',
  Selesai: 'emerald',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = tones[status as ProposalStatus] ?? 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}
