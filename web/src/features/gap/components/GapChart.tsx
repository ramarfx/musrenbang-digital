import type { GapItem } from '@musrenbang/shared';
import { formatPersen } from '@/lib/format';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/Card';

export function GapChart({ items }: { items: GapItem[] }) {
  return (
    <Card>
      <h2 className="text-lg font-bold text-stone-900">Prioritas warga vs APBD</h2>
      <p className="text-sm text-stone-500">Persentase alokasi per kategori.</p>
      <div className="mt-4 h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} layout="vertical" margin={{ right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" />
            <YAxis type="category" dataKey="kategori" width={170} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatPersen(Number(value))} />
            <Legend />
            <Bar dataKey="persen_warga" name="Warga" fill="#047857" radius={[0, 4, 4, 0]} />
            <Bar dataKey="persen_apbd" name="APBD" fill="#14222B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
