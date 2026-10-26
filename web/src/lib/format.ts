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
