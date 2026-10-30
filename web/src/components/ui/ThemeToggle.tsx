import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useTema } from '@/lib/tema';

/**
 * Tombol ganti tema. Ikon menunjukkan mode tujuan (bulan = pindah ke gelap), dan labelnya
 * menyebut tujuan itu dengan kata-kata untuk pembaca layar.
 * `dark` = tombol berada di atas panel gelap (sidebar).
 */
export function ThemeToggle({ dark = false, className }: { dark?: boolean; className?: string }) {
  const [tema, setTema] = useTema();
  const keGelap = tema === 'terang';
  return (
    <button
      type="button"
      onClick={() => setTema(keGelap ? 'gelap' : 'terang')}
      aria-label={keGelap ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'}
      title={keGelap ? 'Mode gelap' : 'Mode terang'}
      className={cn(
        'grid size-11 flex-none place-items-center rounded-xl border transition-[scale,background-color] duration-150 ease-out active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2',
        dark
          ? 'border-white/30 text-white hover:bg-white/10 focus-visible:outline-white'
          : 'border-edge bg-surface text-ink hover:bg-active',
        className,
      )}
    >
      <Icon name={keGelap ? 'bulan' : 'matahari'} />
    </button>
  );
}
