import { FOTO_BUCKET, proposalPhotoSchema, type ProposalPhoto } from '@musrenbang/shared';
import { z } from 'zod';
import { AppError, parseWith, requireUser, toAppError, unwrap } from '@/lib/api';
import { perkecilGambar } from '@/lib/gambar';
import { supabase } from '@/lib/supabase';

export async function listPhotos(proposalId: number): Promise<ProposalPhoto[]> {
  const data = await unwrap(
    supabase
      .from('proposal_photos')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('dibuat_pada', { ascending: true }),
    'foto pengerjaan',
  );
  return parseWith(z.array(proposalPhotoSchema), data, 'foto pengerjaan');
}

/** Semua foto sekaligus, untuk penanda di daftar usulan. Jumlahnya kecil (hanya tahap kerja). */
export async function listAllPhotos(): Promise<ProposalPhoto[]> {
  const data = await unwrap(
    supabase.from('proposal_photos').select('*').order('dibuat_pada', { ascending: false }),
    'foto pengerjaan',
  );
  return parseWith(z.array(proposalPhotoSchema), data, 'foto pengerjaan');
}

export function urlFoto(path: string): string {
  return supabase.storage.from(FOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export type HasilUnggah = { berhasil: number; gagal: number; pesanGalat: string | null };

/**
 * Mengunggah foto satu per satu: kecilkan, kirim ke Storage, lalu catat barisnya. Penjaga di
 * database menolak bila status usulan bukan Dikerjakan atau Selesai, jadi panggil ini SETELAH
 * status diubah. Bila pencatatan baris gagal, berkas yang sudah terunggah dihapus lagi.
 * Satu foto gagal tidak menghentikan yang lain.
 */
export async function unggahFoto(proposalId: number, files: File[]): Promise<HasilUnggah> {
  await requireUser();
  let berhasil = 0;
  let gagal = 0;
  let pesanGalat: string | null = null;
  for (const file of files) {
    try {
      const kecil = await perkecilGambar(file);
      const path = `${proposalId}/${crypto.randomUUID()}.${kecil.ekstensi}`;
      const kirim = await supabase.storage.from(FOTO_BUCKET).upload(path, kecil.blob, {
        contentType: kecil.tipe,
        cacheControl: '31536000',
        upsert: false,
      });
      if (kirim.error) throw toAppError(kirim.error, 'Gagal mengunggah foto.');
      const catat = await supabase
        .from('proposal_photos')
        .insert({ proposal_id: proposalId, path });
      if (catat.error) {
        await supabase.storage.from(FOTO_BUCKET).remove([path]);
        throw toAppError(catat.error, 'Gagal mencatat foto.');
      }
      berhasil += 1;
    } catch (error) {
      gagal += 1;
      pesanGalat ??= error instanceof Error ? error.message : 'Foto gagal diunggah.';
    }
  }
  return { berhasil, gagal, pesanGalat };
}

/** Hapus baris dulu (izin admin dicek di sini), lalu berkasnya. Berkas yatim tidak berbahaya. */
export async function hapusFoto(photo: ProposalPhoto) {
  await requireUser();
  const { data, error } = await supabase
    .from('proposal_photos')
    .delete()
    .eq('id', photo.id)
    .select('id');
  if (error) throw toAppError(error, 'Gagal menghapus foto.');
  if (!data || data.length === 0) throw new AppError('Foto tidak bisa dihapus.');
  await supabase.storage.from(FOTO_BUCKET).remove([photo.path]);
}
