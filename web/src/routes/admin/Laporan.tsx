import { PageHeader } from '@/components/ui/PageHeader';
import { RingkasanAspirasiLengkap } from '@/features/admin/components/RingkasanAspirasi';
import { RankingWarga } from '@/features/admin/components/RankingWarga';

/** Laporan aspirasi warga dan urutan prioritas, dihitung dari data yang sudah disetujui. */
export default function Laporan() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan"
        description="Ringkasan aspirasi warga dan urutan prioritas dari usulan yang sudah disetujui."
      />
      <RingkasanAspirasiLengkap />
      <RankingWarga />
    </div>
  );
}
