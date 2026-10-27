import type { ProposalStatus } from '@musrenbang/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

// Satu keluarga warna: pasir (baru), mustard (dicek), mint (masuk anggaran),
// hijau penuh (berjalan), tinta (tuntas).
const tones: Record<ProposalStatus, BadgeTone> = {
  Diajukan: 'neutral',
  Diverifikasi: 'info',
  'Masuk APBD': 'success',
  Dikerjakan: 'emerald',
  Selesai: 'ink',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = tones[status as ProposalStatus] ?? 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}
