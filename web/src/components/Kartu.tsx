import type { HTMLAttributes, ReactNode } from 'react';

/** Kartu putih datar: garis tipis, tanpa bayangan, sudut 24px. */
export function Kartu({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-border bg-surface p-5 sm:p-6 ${className}`}
      {...props}
    />
  );
}

/**
 * Kartu hero hijau polos dengan lingkaran dekorasi di pojok kanan bawah,
 * motif yang sama dengan sidebar (identitas Desain 1). Tanpa gradasi.
 */
export function KartuHero({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-hijau p-5 text-white sm:p-6 ${className}`}
      {...props}
    >
      <LingkaranDekorasi className="-right-16 -bottom-16 size-44" />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Tiga cincin konsentris tipis putih transparan. Murni hiasan, tidak terbaca pembaca layar. */
export function LingkaranDekorasi({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full border border-white/15 shadow-[0_0_0_34px_rgb(255_255_255/0.05),0_0_0_70px_rgb(255_255_255/0.03)] ${className}`}
    />
  );
}
