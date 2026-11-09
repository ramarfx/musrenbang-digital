import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SimulatorAlur } from '@/features/allocations/components/SimulatorAlur';

/**
 * Simulator tiga langkah: pilih minimal 3 bidang, bagi 10 koin di antaranya, lalu
 * lihat bedanya dengan APBD. Hasilnya disimpan ke tabel alokasi dan dipakai halaman Bandingkan.
 */
export default function Simulator() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulator"
        description="Pilih minimal 3 bidang, bagi 10 koin di antaranya, lalu lihat bedanya dengan APBD. Boleh lebih dari 3. Sekitar 2 menit."
        actions={
          <Link to="/apbd#dokumen-resmi" className={buttonClass('outline', 'sm')}>
            Asal angka APBD
          </Link>
        }
      />
      <SimulatorAlur />
    </div>
  );
}
