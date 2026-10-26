import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <EmptyState
      title="Halaman tidak ditemukan"
      description="Alamat yang kamu buka tidak ada. Mungkin tautannya sudah berubah."
      action={
        <Link to="/" className={buttonClass('primary')}>
          Kembali ke beranda
        </Link>
      }
    />
  );
}
