import type { ProposalStatus } from '@musrenbang/shared';
import type { CSSProperties } from 'react';

/**
 * Warna stabilo tiap tahap, sama dengan batang status di halaman admin. Nama status selalu
 * tampil begini (teks tebal distabilo, seperti nama kategori) di semua halaman.
 */
export const WARNA_STATUS: Record<ProposalStatus, string> = {
  Diajukan: '#F6D98B',
  Diverifikasi: '#A9E0DC',
  'Masuk APBD': '#4FC79C',
  Dikerjakan: '#F5C79B',
  Selesai: '#D9CCF0',
};

const WARNA_LAIN = '#E4DDCF';

export function StatusBadge({ status }: { status: string }) {
  const warna = WARNA_STATUS[status as ProposalStatus] ?? WARNA_LAIN;
  return (
    <span className="tanda-status" style={{ '--tanda': warna } as CSSProperties}>
      {status}
    </span>
  );
}
