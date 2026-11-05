import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatRupiah, formatRupiahRingkas } from '@/lib/format';
import { mintaSaranBiaya } from './costHint';
import { angkaTengah, type MasukanSaran, type SaranBiaya as Saran } from './costHintContract';

type SaranBiayaProps = {
  /** Mengambil isi form saat tombol ditekan, jadi teks tidak dikirim saat warga masih mengetik. */
  ambil: () => MasukanSaran;
  /** Dipanggil dengan angka rupiah ketika warga memilih memakai saran. */
  onPakai: (angka: number) => void;
};

/**
 * Tombol "Perkirakan" di dalam kolom estimasi biaya (di ujung kanan kolomnya, jadi tidak
 * memakan tempat), dan hasilnya muncul sebagai kartu melayang tepat di bawah kolom. Induknya
 * harus `relative`. Judul, deskripsi, dan kategori dikirim ke MusrenAI hanya saat tombol
 * ditekan. Angka baru masuk ke kolom bila warga menekan "Pakai ...".
 */
export function SaranBiaya({ ambil, onPakai }: SaranBiayaProps) {
  const [memuat, setMemuat] = useState(false);
  const [saran, setSaran] = useState<Saran | null>(null);
  const [galat, setGalat] = useState('');

  if (import.meta.env.VITE_MUSRENAI_ENABLED !== 'true') return null;

  const minta = async () => {
    if (memuat) return;
    setMemuat(true);
    setGalat('');
    setSaran(null);
    try {
      setSaran(await mintaSaranBiaya(ambil()));
    } catch (sebab) {
      setGalat(sebab instanceof Error ? sebab.message : 'Saran biaya belum tersedia.');
    } finally {
      setMemuat(false);
    }
  };

  const tutup = () => {
    setSaran(null);
    setGalat('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void minta()}
        disabled={memuat}
        className="absolute top-1/2 right-1.5 inline-flex h-8 -translate-y-1/2 items-center rounded-lg bg-ink px-3 text-[13px] font-bold text-on-ink transition-[scale,background-color,opacity] duration-150 ease-out hover:bg-ink-tekan active:scale-[0.96] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
      >
        {memuat ? 'Menghitung…' : 'Perkirakan'}
      </button>

      {(galat || saran) && (
        <div
          role={galat ? 'alert' : 'status'}
          className="anim-popover absolute top-full right-0 left-0 z-20 mt-2 rounded-2xl border-[1.5px] border-edge bg-surface p-3.5 text-sm shadow-[0_4px_0_var(--edge)]"
        >
          {galat && <p className="text-[13px] font-semibold text-red-700">{galat}</p>}
          {saran && (
            <>
              <p className="text-[12.5px] text-muted">Perkiraan MusrenAI</p>
              <p className="mt-0.5 text-base font-bold">
                {formatRupiahRingkas(saran.min)} sampai {formatRupiahRingkas(saran.max)}
              </p>
              <p className="mt-1.5 text-[13px] text-ink/80 [overflow-wrap:anywhere]">
                {saran.alasan}
              </p>
              <p className="mt-1.5 text-[12px] text-muted">{saran.label}</p>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {saran && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onPakai(angkaTengah(saran));
                  tutup();
                }}
              >
                Pakai {formatRupiah(angkaTengah(saran))}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={tutup}>
              Tutup
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
