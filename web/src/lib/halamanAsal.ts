const KUNCI = 'musrenbang:halaman-asal';

/** Simpan halaman terakhir yang dibuka sebelum masuk ke halaman login. */
export function simpanHalamanAsal(alamat: string) {
  try {
    sessionStorage.setItem(KUNCI, alamat);
  } catch {
    // Penyimpanan diblokir: setelah login warga dibawa ke beranda.
  }
}

export function bacaHalamanAsal(): string | null {
  try {
    return sessionStorage.getItem(KUNCI);
  } catch {
    return null;
  }
}

const KUNCI_PERNAH = 'musrenbang:pernah-masuk';
const KUNCI_KEMBALI = 'musrenbang:kembali-setelah-google';

/** Perangkat ini pernah dipakai masuk, jadi bukan pertama kali. */
export function sudahPernahMasuk(): boolean {
  try {
    return localStorage.getItem(KUNCI_PERNAH) === '1';
  } catch {
    return false;
  }
}

export function tandaiPernahMasuk() {
  try {
    localStorage.setItem(KUNCI_PERNAH, '1');
  } catch {
    // Tanpa penanda, warga dianggap baru dan dibawa ke landing.
  }
}

/** Login Google meninggalkan situs: ingat halaman asalnya untuk dikembalikan sesudahnya. */
export function simpanKembaliGoogle(alamat: string) {
  try {
    sessionStorage.setItem(KUNCI_KEMBALI, alamat);
  } catch {
    // Tanpa ini warga mendarat di landing.
  }
}

export function ambilKembaliGoogle(): string | null {
  try {
    const alamat = sessionStorage.getItem(KUNCI_KEMBALI);
    sessionStorage.removeItem(KUNCI_KEMBALI);
    return alamat;
  } catch {
    return null;
  }
}

/**
 * Tujuan sesudah login: halaman asal. Dibawa ke landing hanya bila asalnya landing atau ini
 * pertama kali perangkat dipakai masuk.
 */
export function tujuanSetelahLogin(dariHalaman?: string): string {
  if (dariHalaman) return dariHalaman;
  if (!sudahPernahMasuk()) return '/';
  return bacaHalamanAsal() ?? '/beranda';
}
