import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <EmptyState
      title="Halaman tidak ditemukan"
      description="Alamat yang kamu buka tidak ada. Mungkin tautannya sudah berubah."
      action={
        <Link
          to="/"
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Kembali ke beranda
        </Link>
      }
    />
  );
}
