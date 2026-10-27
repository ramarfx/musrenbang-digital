import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';

/**
 * Kartu konfirmasi sesudah pilihan tersimpan, dengan tautan langsung ke Bandingkan (PRD FR-08).
 * Hilang sendiri begitu warga mengubah pilihannya lagi.
 */
export function SetelahSimpan() {
  return (
    <div role="status" className="rounded-2xl bg-mint-pucat p-4 text-sm text-mint-tua">
      <b className="block text-[15px]">Pilihanmu tersimpan.</b>
      <span className="mt-0.5 block">
        Lihat bagaimana pilihanmu mengubah perbandingan warga dengan APBD.
      </span>
      <Link to="/bandingkan" className={buttonClass('secondary', 'sm', 'mt-3')}>
        Lihat di Bandingkan
      </Link>
    </div>
  );
}
