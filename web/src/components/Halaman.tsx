import type { ReactNode } from 'react';

/** Judul halaman: h1 24px, satu kalimat penjelas, dan maksimal satu aksi di kanan. */
export function JudulHalaman({
  judul,
  sub,
  aksi,
}: {
  judul: string;
  sub?: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div>
        <h1 className="text-[21px] leading-tight font-bold tracking-[-0.02em] sm:text-2xl">
          {judul}
        </h1>
        {sub && <p className="mt-1 max-w-[62ch] text-muted">{sub}</p>}
      </div>
      {aksi && <div className="flex-none">{aksi}</div>}
    </div>
  );
}

/** Data sedang dimuat: kalimat tentang apa yang dimuat, di dalam bingkai blok. */
export function Memuat({ apa }: { apa: string }) {
  return (
    <p
      role="status"
      className="rounded-2xl border border-dashed border-border px-4 py-6 text-muted"
    >
      Memuat {apa}...
    </p>
  );
}

/** Data kosong: sebab dan langkah berikutnya. */
export function Kosong({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-muted">
      {children}
    </div>
  );
}

/** Gagal memuat: apa yang gagal dan tombol coba lagi, tetap di dalam bloknya. */
export function Gagal({ apa, pesan, ulangi }: { apa: string; pesan: string; ulangi: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-border bg-surface px-4 py-5">
      <p className="font-semibold">Gagal memuat {apa}.</p>
      <p className="mt-1 text-sm text-muted">{pesan}</p>
      <button
        type="button"
        onClick={ulangi}
        className="mt-3 text-sm font-semibold text-warga underline underline-offset-4"
      >
        Coba lagi
      </button>
    </div>
  );
}
