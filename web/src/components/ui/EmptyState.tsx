import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-dashed border-stone-300 bg-surface/60 p-8 text-center',
        className,
      )}
    >
      <h2 className="font-semibold text-stone-800">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
