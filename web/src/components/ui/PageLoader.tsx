import { Spinner } from './Spinner';

export function PageLoader({ label = 'Memuat halaman...' }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 text-stone-500">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
