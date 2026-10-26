import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'emerald' | 'ink';

// Palet Desain 1, tanpa biru: pasir, mustard, mint, hijau, tinta. Merah hanya untuk galat.
const tones: Record<BadgeTone, string> = {
  neutral: 'bg-pasir text-ink',
  info: 'bg-mustard-pucat text-mustard-tua',
  warning: 'bg-mustard-pucat text-mustard-tua',
  success: 'bg-mint-pucat text-mint-tua',
  danger: 'bg-red-100 text-red-800',
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
        'inline-flex h-6 flex-none items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
