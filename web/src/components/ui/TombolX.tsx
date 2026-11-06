import { Icon } from '@/components/ui/Icon';

/** Tombol tutup berbentuk X untuk pojok kanan atas pop-up, sama di semua pop-up. */
export function TombolX({ onClick, label = 'Tutup' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 flex-none place-items-center rounded-xl border border-border bg-surface text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
    >
      <Icon name="tutup" size={18} />
    </button>
  );
}
