import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { Button, buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/**
 * Layar saat sebuah halaman gagal dimuat. Penyebab paling sering: aplikasi baru diperbarui dan
 * berkas lama sudah diganti, jadi memuat ulang hampir selalu menyelesaikannya. Pesan teknis
 * tidak dibuang, hanya dilipat supaya warga tidak melihat istilah yang tidak mereka butuhkan.
 */
export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Terjadi kesalahan yang tidak diketahui.';

  return (
    <div className="mx-auto max-w-md px-4 py-14 text-center" role="alert">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border-[1.5px] border-ink bg-surface">
        <Icon name="putus" size={28} />
      </span>
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">
        Ups, halamannya tidak mau terbuka
      </h1>
      <p className="mt-1.5 text-muted">
        Ini bukan salahmu. Coba muat ulang, atau kembali ke beranda.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Button type="button" size="md" onClick={() => window.location.reload()}>
          <Icon name="muatUlang" size={18} />
          Muat ulang halaman
        </Button>
        <Link to="/" className={buttonClass('ghost', 'md', 'font-bold text-warga underline')}>
          Kembali ke beranda
        </Link>
      </div>
      <details className="mt-3 text-sm text-muted">
        <summary className="mx-auto w-fit cursor-pointer font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga">
          Lihat detail teknis
        </summary>
        <code className="mt-1.5 block rounded-lg bg-track px-2.5 py-2 text-left text-xs [overflow-wrap:anywhere] text-ink">
          {detail}
        </code>
      </details>
    </div>
  );
}
