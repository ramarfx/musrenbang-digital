import { PageHeader } from '@/components/ui/PageHeader';
import { BudgetSimulator } from '@/features/allocations/components/BudgetSimulator';
import { useAppConfigQuery } from '@/features/config/queries';
import { formatRupiah } from '@/lib/format';

export default function Simulator() {
  const configQuery = useAppConfigQuery();
  const budget = configQuery.data?.virtualBudgetPerWarga ?? 10_000_000;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulator anggaran virtual"
        description={`Setiap warga mendapat anggaran virtual ${formatRupiah(budget)} untuk dibagikan ke seluruh kategori. Ini bukan uang nyata; agregat semua warga tampil di halaman Bandingkan.`}
      />
      <BudgetSimulator />
    </div>
  );
}
