import { z } from 'zod';
import { PROPOSAL_MODERATION_STATUSES, PROPOSAL_STATUSES, TEXT_LIMITS } from '../constants';
import { idSchema, timestampSchema, uuidSchema } from './common';

export const proposalStatusSchema = z.enum(PROPOSAL_STATUSES);
export const proposalModerationSchema = z.enum(PROPOSAL_MODERATION_STATUSES);

export const proposalModerationInputSchema = z
  .object({
    proposalId: idSchema,
    moderasi: proposalModerationSchema,
    catatan: z.string().trim().max(2_000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.moderasi === 'Ditolak' && !value.catatan) {
      ctx.addIssue({
        code: 'custom',
        path: ['catatan'],
        message: 'Penolakan wajib disertai alasan.',
      });
    }
  });

/** Baris tabel `proposals` (tanpa kolom turunan). */
export const proposalRowSchema = z.object({
  id: idSchema,
  judul: z.string().min(1),
  deskripsi: z.string(),
  kategori: z.string().min(1),
  lokasi: z.string().nullable(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  estimasi_biaya: z.coerce.number().int().nonnegative(),
  pengusul_id: uuidSchema.nullable(),
  status: proposalStatusSchema,
  moderasi: proposalModerationSchema,
  catatan_moderasi: z.string().nullable(),
  dimoderasi_oleh: uuidSchema.nullable(),
  dimoderasi_pada: timestampSchema.nullable(),
  dibuat_pada: timestampSchema,
  diubah_pada: timestampSchema,
});

/** Baris view `v_proposals`: sudah membawa nama pengusul dan jumlah suara. */
export const proposalSchema = proposalRowSchema.extend({
  pengusul_nama: z.string(),
  jumlah_suara: z.coerce.number().int().nonnegative(),
});

export const proposalInputSchema = z
  .object({
    judul: z
      .string()
      .trim()
      .min(TEXT_LIMITS.judulMin, `Judul minimal ${TEXT_LIMITS.judulMin} karakter.`)
      .max(TEXT_LIMITS.judulMaks, `Judul maksimal ${TEXT_LIMITS.judulMaks} karakter.`),
    deskripsi: z
      .string()
      .trim()
      .min(TEXT_LIMITS.deskripsiMin, `Deskripsi minimal ${TEXT_LIMITS.deskripsiMin} karakter.`)
      .max(TEXT_LIMITS.deskripsiMaks, `Deskripsi maksimal ${TEXT_LIMITS.deskripsiMaks} karakter.`),
    kategori: z.string().trim().min(1, 'Kategori wajib dipilih.'),
    lokasi: z
      .string()
      .trim()
      .max(TEXT_LIMITS.lokasiMaks, `Lokasi maksimal ${TEXT_LIMITS.lokasiMaks} karakter.`)
      .nullable()
      .optional(),
    latitude: z
      .number()
      .min(-90, 'Latitude tidak valid.')
      .max(90, 'Latitude tidak valid.')
      .nullable()
      .optional(),
    longitude: z
      .number()
      .min(-180, 'Longitude tidak valid.')
      .max(180, 'Longitude tidak valid.')
      .nullable()
      .optional(),
    estimasi_biaya: z
      .number()
      .int('Estimasi biaya harus bilangan bulat.')
      .positive('Estimasi biaya harus lebih besar dari nol.')
      .max(TEXT_LIMITS.estimasiMaks, 'Estimasi biaya terlalu besar.'),
  })
  .superRefine((value, ctx) => {
    const punyaLatitude = value.latitude !== null && value.latitude !== undefined;
    const punyaLongitude = value.longitude !== null && value.longitude !== undefined;
    if (punyaLatitude !== punyaLongitude) {
      ctx.addIssue({
        code: 'custom',
        path: ['latitude'],
        message: 'Isi latitude dan longitude sekaligus, atau kosongkan keduanya.',
      });
    }
  });

export const proposalStatusUpdateSchema = z.object({
  proposalId: idSchema,
  status: proposalStatusSchema,
});

export const proposalStatusUpdateWithNoteSchema = proposalStatusUpdateSchema.extend({
  catatan: z
    .string()
    .trim()
    .min(1, 'Catatan perubahan status wajib diisi.')
    .max(2_000, 'Catatan perubahan status maksimal 2000 karakter.'),
});

export const statusHistoryRowSchema = z.object({
  id: idSchema,
  proposal_id: idSchema,
  status_lama: z.string().nullable(),
  status_baru: z.string(),
  diubah_oleh: uuidSchema.nullable(),
  diubah_pada: timestampSchema,
  // View remote lama belum menyediakan kolom catatan sebelum migration 7.
  catatan: z.string().nullable().default(null),
});

export const statusHistorySchema = statusHistoryRowSchema.omit({ diubah_oleh: true }).extend({
  diubah_oleh_nama: z.string().nullable(),
});

/** Foto pengerjaan usulan yang diunggah admin saat status Dikerjakan atau Selesai. */
export const proposalPhotoSchema = z.object({
  id: idSchema,
  proposal_id: idSchema,
  /** Lokasi berkas di bucket `foto-pengerjaan`: "<proposal_id>/<uuid>.webp". */
  path: z.string().min(3),
  status: z.enum(['Dikerjakan', 'Selesai']),
  keterangan: z.string().nullable().default(null),
  diunggah_oleh: uuidSchema.nullable(),
  dibuat_pada: timestampSchema,
});

/**
 * Catatan pengeluaran pengerjaan usulan. Tambah-saja: jumlah positif = pengeluaran, negatif =
 * koreksi atas catatan sebelumnya. Total pengeluaran adalah jumlah semua baris.
 */
export const proposalSpendingSchema = z.object({
  id: idSchema,
  proposal_id: idSchema,
  jumlah: z.coerce.number().int(),
  keterangan: z.string(),
  sumber: z.string().nullable().default(null),
  dicatat_oleh: uuidSchema.nullable(),
  dicatat_pada: timestampSchema,
});

/** Masukan formulir catat pengeluaran (jumlah selalu positif; koreksi menandainya sendiri). */
export const spendingInputSchema = z.object({
  proposalId: idSchema,
  jumlah: z.number().int().positive('Jumlah harus lebih dari nol.').max(100_000_000_000_000),
  koreksi: z.boolean().default(false),
  keterangan: z
    .string()
    .trim()
    .min(3, 'Tulis untuk apa dana ini dipakai.')
    .max(300, 'Keterangan maksimal 300 karakter.'),
  sumber: z.string().trim().max(300, 'Sumber maksimal 300 karakter.').optional(),
});

/** Bentuk usulan di berkas seed (tanpa id/timestamp buatan database). */
export const proposalSeedSchema = z.object({
  judul: z.string().trim().min(TEXT_LIMITS.judulMin),
  deskripsi: z.string().trim().min(TEXT_LIMITS.deskripsiMin),
  kategori: z.string().trim().min(1),
  lokasi: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  estimasi_biaya: z.number().int().positive(),
  status: proposalStatusSchema.default('Diajukan'),
});

export type ProposalRow = z.infer<typeof proposalRowSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalInput = z.infer<typeof proposalInputSchema>;
export type ProposalStatusUpdate = z.infer<typeof proposalStatusUpdateSchema>;
export type ProposalStatusUpdateWithNote = z.infer<typeof proposalStatusUpdateWithNoteSchema>;
export type ProposalModerationInput = z.infer<typeof proposalModerationInputSchema>;
export type ProposalSeed = z.infer<typeof proposalSeedSchema>;
export type StatusHistoryRow = z.infer<typeof statusHistoryRowSchema>;
export type StatusHistory = z.infer<typeof statusHistorySchema>;
export type ProposalPhoto = z.infer<typeof proposalPhotoSchema>;
export type ProposalSpending = z.infer<typeof proposalSpendingSchema>;
export type SpendingInput = z.output<typeof spendingInputSchema>;
