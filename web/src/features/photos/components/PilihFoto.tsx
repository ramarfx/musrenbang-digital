import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const TIPE_BOLEH = ['image/jpeg', 'image/png', 'image/webp'];
/** Batas berkas mentah sebelum dikecilkan; foto kamera ponsel biasanya 3 sampai 8 MB. */
const MAKS_BYTE_MENTAH = 20 * 1024 * 1024;

type PilihFotoProps = {
  files: File[];
  onChange: (files: File[]) => void;
  /** Sisa tempat foto untuk usulan ini (batas 12 dikurangi yang sudah tersimpan). */
  sisa: number;
  disabled?: boolean;
};

/**
 * Pemilih foto untuk admin: baris foto kecil yang bisa digeser ke samping, dengan kotak
 * "Tambah" di ujungnya. Foto baru dikecilkan saat diunggah, bukan di sini; yang tampil hanya
 * pratinjau dari berkas pilihan.
 */
export function PilihFoto({ files, onChange, sisa, disabled = false }: PilihFotoProps) {
  const input = useRef<HTMLInputElement>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const pratinjau = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(
    () => () => {
      for (const alamat of pratinjau) URL.revokeObjectURL(alamat);
    },
    [pratinjau],
  );

  const tambah = (dipilih: FileList | null) => {
    if (!dipilih) return;
    const baru: File[] = [];
    let ditolak = 0;
    for (const file of Array.from(dipilih)) {
      if (!TIPE_BOLEH.includes(file.type) || file.size > MAKS_BYTE_MENTAH) {
        ditolak += 1;
      } else if (files.length + baru.length < sisa) {
        baru.push(file);
      } else {
        ditolak += 1;
      }
    }
    onChange([...files, ...baru]);
    setPesan(
      ditolak > 0
        ? `${ditolak} berkas dilewati. Pakai foto JPG, PNG, atau WebP di bawah 20 MB, dan maksimal ${sisa} foto.`
        : null,
    );
    if (input.current) input.current.value = '';
  };

  const hapus = (indeks: number) => {
    onChange(files.filter((_, i) => i !== indeks));
    setPesan(null);
  };

  const penuh = files.length >= sisa;

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={TIPE_BOLEH.join(',')}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => tambah(event.target.files)}
      />
      <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        {files.map((file, indeks) => (
          <li key={`${file.name}-${indeks}`} className="relative w-24 flex-none">
            <img
              src={pratinjau[indeks]}
              alt={`Pratinjau ${file.name}`}
              className="aspect-[4/3] w-full rounded-[10px] border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => hapus(indeks)}
              disabled={disabled}
              aria-label={`Hapus ${file.name}`}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full border-[1.5px] border-edge bg-surface text-ink transition-[scale] duration-150 ease-out hover:bg-active active:scale-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
            >
              <Icon name="tutup" size={12} />
            </button>
          </li>
        ))}
        {!penuh && (
          <li className="w-24 flex-none">
            <button
              type="button"
              disabled={disabled}
              onClick={() => input.current?.click()}
              className="grid aspect-[4/3] w-full place-items-center rounded-[10px] border-2 border-dashed border-edge bg-surface text-[12.5px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-active disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
            >
              <span className="grid justify-items-center gap-0.5">
                <Icon name="kamera" size={20} />
                Tambah
              </span>
            </button>
          </li>
        )}
      </ul>
      <p className="mt-1.5 text-[12.5px] text-muted" aria-live="polite">
        {files.length} dari {sisa} foto dipilih. Foto dikecilkan otomatis dan data lokasinya dibuang
        sebelum dikirim.
      </p>
      {pesan && (
        <p role="alert" className="mt-1 text-[12.5px] text-red-700">
          {pesan}
        </p>
      )}
    </div>
  );
}
