import { cn } from '@/lib/cn';

export type TampilanDaftar = 'kartu' | 'daftar';

const PILIHAN = [
  ['kartu', 'Kartu', 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'],
  ['daftar', 'Daftar', 'M4 6h16M4 12h16M4 18h16'],
] as const;

/** Dua tombol untuk memilih daftar usulan tampil sebagai kartu atau sebagai baris. */
export function TombolTampilan({
  nilai,
  onUbah,
}: {
  nilai: TampilanDaftar;
  onUbah: (nilai: TampilanDaftar) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Tampilan daftar"
      className="flex rounded-xl border border-border bg-surface p-0.5"
    >
      {PILIHAN.map(([pilihan, label, ikon]) => (
        <button
          key={pilihan}
          type="button"
          aria-pressed={nilai === pilihan}
          onClick={() => onUbah(pilihan)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
            nilai === pilihan ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink',
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-4"
          >
            <path d={ikon} />
          </svg>
          {label}
        </button>
      ))}
    </div>
  );
}
