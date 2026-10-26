import { cn } from '@/lib/cn';

/** Tiga cincin konsentris tipis putih transparan, motif Desain 1. Murni hiasan. */
export function DecorRings({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute rounded-full border border-white/15 shadow-[0_0_0_34px_rgb(255_255_255/0.05),0_0_0_70px_rgb(255_255_255/0.03)]',
        className,
      )}
    />
  );
}
