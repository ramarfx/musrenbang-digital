import { describeGap, type GapItem } from '@musrenbang/shared';
import { Card } from '@/components/ui/Card';

export function GapHighlight({ item }: { item: GapItem }) {
  return (
    // Kartu hero hijau Desain 1 untuk temuan utama halaman Bandingkan.
    <Card className="border-transparent bg-hijau text-white">
      <p className="text-sm text-white/75">Gap terbesar</p>
      <h2 className="mt-1 text-xl font-bold">{item.kategori}</h2>
      <p className="mt-2 max-w-[62ch] text-white/90">{describeGap(item)}</p>
    </Card>
  );
}
