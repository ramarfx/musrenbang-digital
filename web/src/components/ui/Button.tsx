import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-800 text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-emerald-800',
  secondary:
    'bg-amber-500 text-stone-900 shadow-sm hover:bg-amber-400 focus-visible:outline-amber-500',
  outline:
    'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 focus-visible:outline-emerald-800',
  ghost: 'text-stone-700 hover:bg-stone-100 focus-visible:outline-emerald-800',
  danger: 'bg-red-700 text-white hover:bg-red-600 focus-visible:outline-red-700',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

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
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Spinner label="Memproses" />}
      {children}
    </button>
  );
});
