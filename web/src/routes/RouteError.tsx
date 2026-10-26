import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { ErrorState } from '@/components/ui/ErrorState';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Terjadi kesalahan yang tidak diketahui.';

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <ErrorState title="Halaman gagal dimuat" message={message} />
      <Link to="/" className="text-sm font-medium text-emerald-800 underline">
        Kembali ke beranda
      </Link>
    </div>
  );
}
