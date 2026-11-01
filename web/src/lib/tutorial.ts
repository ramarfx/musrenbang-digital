// Tanda sudah melihat tutorial disimpan per akun di browser ini. Di perangkat lain tutorial
// muncul sekali lagi; itu disengaja supaya tidak perlu kolom baru di database.
const kunci = (userId: string) => `mb-tutorial-selesai:${userId}`;

export function sudahLihatTutorial(userId: string): boolean {
  try {
    return localStorage.getItem(kunci(userId)) === '1';
  } catch {
    // Penyimpanan ditolak (mode privat): jangan paksa tutorial muncul di setiap halaman.
    return true;
  }
}

export function tandaiTutorialSelesai(userId: string) {
  try {
    localStorage.setItem(kunci(userId), '1');
  } catch {
    // Tanpa penyimpanan, tutorial cukup hilang untuk sesi ini.
  }
}
