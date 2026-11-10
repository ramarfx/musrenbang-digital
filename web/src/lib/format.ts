export function formatRupiah(nilai: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nilai);
}

export function formatRupiahRingkas(nilai: number): string {
  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 1,
  }).format(nilai);
}

export function formatPersen(nilai: number): string {
  return `${nilai.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
}

/**
 * Angka rupiah besar dalam satuan yang cepat dibaca, mis. "Rp3,5 T" atau "Rp820 M".
 * Dipakai di teks ringkas; versi panjangnya untuk kalimat.
 */
export function formatBesarSingkat(nilai: number): string {
  if (nilai >= 1e12)
    return `Rp${(nilai / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`;
  if (nilai >= 1e9)
    return `Rp${(nilai / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (nilai >= 1e6)
    return `Rp${(nilai / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  return `Rp${Math.round(nilai).toLocaleString('id-ID')}`;
}

/** Versi panjang untuk kalimat, mis. "Rp3,5 triliun". */
export function formatBesarPanjang(nilai: number): string {
  return formatBesarSingkat(nilai)
    .replace(' T', ' triliun')
    .replace(' M', ' miliar')
    .replace(' jt', ' juta');
}

export function formatAngka(nilai: number): string {
  return nilai.toLocaleString('id-ID');
}

export function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTanggalWaktu(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
