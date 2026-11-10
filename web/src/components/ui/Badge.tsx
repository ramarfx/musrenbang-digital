import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'emerald' | 'ink';

// Bentuk dan warna sama dengan nama status usulan (.tanda-status): teks tebal distabilo, sudut
// 3px. Warnanya diambil dari stabilo tahap supaya semua label di semua halaman satu keluarga.
const tones: Record<BadgeTone, string> = {
  neutral: 'bg-[#E4DDCF] text-hitam',
  info: 'bg-[#A9E0DC] text-hitam',
  warning: 'bg-[#F6D98B] text-hitam',
  success: 'bg-[#4FC79C] text-hitam',
  danger: 'bg-[#F5B9B0] text-hitam',
  emerald: 'bg-hijau text-white',
  ink: 'bg-ink text-ground',
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center rounded-[3px] px-1.5 py-px text-[13px] leading-5 font-bold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
