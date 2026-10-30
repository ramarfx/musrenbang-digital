import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

// Desain 2: aksi utama memakai tinta; tombol garis bertepi tinta seperti kartu.
// Tanpa bayangan; sudut tombol 12px, bukan pil.
const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-on-ink hover:bg-ink-tekan disabled:bg-mati disabled:text-muted disabled:opacity-100',
  secondary: 'bg-hijau text-white hover:bg-hijau-tekan',
  outline: 'border border-edge bg-surface text-ink hover:bg-active',
  ghost: 'text-ink hover:bg-active',
  danger: 'bg-[#b42318] text-white hover:bg-[#8a1c13] focus-visible:outline-[#b42318]',
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-[scale,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

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
