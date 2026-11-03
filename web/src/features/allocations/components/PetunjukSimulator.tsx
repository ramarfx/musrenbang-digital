import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * Kartu petunjuk di atas kedua cara simulator: tiga langkah bergambar dan satu bar kemajuan
 * sepuluh ruas. Dipakai bersama supaya berpindah tab tidak menggeser tata letak.
 */
export function PetunjukSimulator({
  langkah,
  ruasTerisi,
  keterangan,
}: {
  langkah: { ikon: IconName; teks: string }[];
  /** Jumlah ruas bar yang menyala, 0 sampai 10. */
  ruasTerisi: number;
  keterangan: string;
}) {
  return (
    <section
      aria-label="Cara mengisi"
      className="rounded-3xl border-[1.5px] border-edge bg-surface p-4 shadow-[0_4px_0_var(--edge)] sm:p-5"
    >
      <ol className="stagger grid gap-3.5 sm:min-h-[3.75rem] sm:grid-cols-3">
        {langkah.map((item, index) => (
          <li key={item.teks} className="flex items-start gap-3 text-sm text-ink">
            <span className="grid size-7 flex-none place-items-center rounded-full bg-ink text-[13px] font-bold text-on-ink">
              {index + 1}
            </span>
            <span className="pt-0.5">
              <span className="mr-1.5 inline-block align-[-3px] text-warga">
                <Icon name={item.ikon} size={17} />
              </span>
              {item.teks}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-center gap-3 border-t border-rule pt-3.5">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-200',
                index < ruasTerisi ? 'bg-hijau-terang' : 'bg-track',
              )}
            />
          ))}
        </div>
        <p className="text-[13px] font-semibold whitespace-nowrap text-ink">{keterangan}</p>
      </div>
    </section>
  );
}
