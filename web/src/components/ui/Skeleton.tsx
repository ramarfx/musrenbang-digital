import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-stone-200/80', className)} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-3xl border border-border bg-surface p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-4 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
