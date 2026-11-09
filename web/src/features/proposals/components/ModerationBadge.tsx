import type { ProposalModeration } from '@musrenbang/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

// Moderasi terpisah dari lima tahap kemajuan: ini soal boleh tidaknya usulan tampil publik.
const TONE: Record<ProposalModeration, BadgeTone> = {
  Menunggu: 'warning',
  Disetujui: 'success',
  Ditolak: 'danger',
};

const LABEL: Record<ProposalModeration, string> = {
  Menunggu: 'Menunggu persetujuan',
  Disetujui: 'Disetujui',
  Ditolak: 'Ditolak',
};

export const LABEL_MODERASI = LABEL;

export function ModerationBadge({ moderasi }: { moderasi: ProposalModeration }) {
  return <Badge tone={TONE[moderasi]}>{LABEL[moderasi]}</Badge>;
}
