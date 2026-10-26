import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

// Desain 1: aksi utama memakai tinta (warna ikon logo), hijau untuk aksi kedua.
// Tanpa bayangan; semua tombol bulat penuh.
const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-white hover:bg-ink-tekan disabled:bg-mati disabled:text-muted disabled:opacity-100',
  secondary: 'bg-hijau text-white hover:bg-hijau-tekan',
  outline: 'border border-border bg-surface text-ink hover:bg-active',
  ghost: 'text-ink hover:bg-active',
  danger: 'bg-red-700 text-white hover:bg-red-600 focus-visible:outline-red-700',
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[transform,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
};

/** Kelas tombol untuk elemen lain (mis. `<Link>`) supaya tampilannya sama dengan `<Button>`. */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {isLoading && <Spinner label="Memproses" />}
      {children}
    </button>
  );
});
