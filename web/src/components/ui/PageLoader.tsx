import { LogoLoader } from '@/components/brand/LogoLoader';

/**
 * Pemuat halaman: logo utuh dengan tiga titik bergerak, tanpa teks di layar.
 * Teks `label` hanya untuk pembaca layar. Tampil setelah jeda singkat supaya tidak berkedip.
 */
export function PageLoader({ label = 'Memuat halaman...' }: { label?: string }) {
  return <LogoLoader label={label} />;
}
