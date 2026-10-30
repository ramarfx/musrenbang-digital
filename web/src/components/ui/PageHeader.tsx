import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-3xl">
        <h1 className="text-[22px] leading-snug font-bold tracking-[-0.02em] text-ink sm:text-[26px]">
          {/* Tanda stabilo: motif yang sama dengan judul bagian di landing. */}
          <span className="stabilo">{title}</span>
        </h1>
        {description && <p className="mt-1 max-w-[62ch] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
