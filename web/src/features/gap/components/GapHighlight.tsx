import { describeGap, type GapItem } from '@musrenbang/shared';
import { Card } from '@/components/ui/Card';

export function GapHighlight({ item }: { item: GapItem }) {
  return (
    <Card className="border-amber-300 bg-amber-50">
      <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">Gap terbesar</p>
      <h2 className="mt-1 text-xl font-bold text-stone-900">{item.kategori}</h2>
      <p className="mt-2 text-sm text-stone-700">{describeGap(item)}</p>
    </Card>
  );
}
