/** Sisi terpanjang foto setelah dikecilkan, dalam piksel. */
export const SISI_MAKS_FOTO = 1280;

/**
 * Ukuran baru dengan sisi terpanjang paling besar `maks`, perbandingan tetap. Foto yang sudah
 * lebih kecil tidak diperbesar.
 */
export function hitungUkuran(lebar: number, tinggi: number, maks = SISI_MAKS_FOTO) {
  const terpanjang = Math.max(lebar, tinggi);
  if (terpanjang <= maks) return { lebar, tinggi };
  const skala = maks / terpanjang;
  return { lebar: Math.round(lebar * skala), tinggi: Math.round(tinggi * skala) };
}

export type GambarKecil = {
  blob: Blob;
  tipe: 'image/webp' | 'image/jpeg';
  ekstensi: 'webp' | 'jpg';
};

/**
 * Mengecilkan foto di browser sebelum diunggah. Digambar ulang lewat canvas, jadi data EXIF
 * (termasuk koordinat GPS) ikut terbuang, sedangkan arah foto tetap benar.
 */
export async function perkecilGambar(file: File, maks = SISI_MAKS_FOTO): Promise<GambarKecil> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { lebar, tinggi } = hitungUkuran(bitmap.width, bitmap.height, maks);
    const kanvas = document.createElement('canvas');
    kanvas.width = lebar;
    kanvas.height = tinggi;
    const konteks = kanvas.getContext('2d');
    if (!konteks) throw new Error('Browser tidak bisa memproses gambar.');
    konteks.drawImage(bitmap, 0, 0, lebar, tinggi);

    const keBlob = (tipe: string, mutu: number) =>
      new Promise<Blob | null>((selesai) => kanvas.toBlob(selesai, tipe, mutu));
    const webp = await keBlob('image/webp', 0.82);
    if (webp && webp.type === 'image/webp') {
      return { blob: webp, tipe: 'image/webp', ekstensi: 'webp' };
    }
    const jpeg = await keBlob('image/jpeg', 0.85);
    if (!jpeg) throw new Error('Gagal mengecilkan foto.');
    return { blob: jpeg, tipe: 'image/jpeg', ekstensi: 'jpg' };
  } finally {
    bitmap.close();
  }
}
