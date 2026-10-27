import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const fieldClass =
  'w-full rounded-xl border border-stone-300 bg-surface px-3.5 py-2.5 text-[15px] text-ink transition-colors placeholder:text-stone-400 focus:border-warga focus:outline-none focus:ring-2 focus:ring-warga/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/20';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldClass, className)}
      {...props}
    />
  );
});
