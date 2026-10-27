import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** id elemen judul di dalam isi, untuk pembaca layar. */
  labelledBy: string;
  /** Lebar dan ukuran lain, mis. `w-[min(720px,calc(100vw-24px))]`. */
  className?: string;
  children: ReactNode;
};

/**
 * Pop-up berbasis elemen <dialog> asli: fokus terkunci di dalam, Escape menutup, dan
 * pembaca layar mengenalinya. Klik di luar isi (pada latar gelap) juga menutup.
 * Gerak buka ada di styles/index.css (kelas `anim-dialog`); tertutupnya langsung.
 * Scrollbar halaman disembunyikan secara global, jadi mengunci scroll tidak menggeser layout.
 */
export function Modal({ open, onClose, labelledBy, className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    }
    if (!open && dialog.open) dialog.close();
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'anim-dialog no-scrollbar m-auto max-h-[calc(100dvh-24px)] overflow-y-auto rounded-3xl border border-border bg-ground p-0 text-ink backdrop:bg-ink/55',
        className,
      )}
    >
      {children}
    </dialog>
  );
}
