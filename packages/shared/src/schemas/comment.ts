import { z } from 'zod';
import { TEXT_LIMITS } from '../constants';
import { idSchema, timestampSchema } from './common';

export const commentInputSchema = z.object({
  proposalId: idSchema,
  isi: z
    .string()
    .trim()
    .min(TEXT_LIMITS.komentarMin, `Komentar minimal ${TEXT_LIMITS.komentarMin} karakter.`)
    .max(TEXT_LIMITS.komentarMaks, `Komentar maksimal ${TEXT_LIMITS.komentarMaks} karakter.`),
});

export const commentRowSchema = z.object({
  id: idSchema,
  proposal_id: idSchema,
  user_id: z.string().uuid(),
  isi: z.string(),
  dibuat_pada: timestampSchema,
});

export const commentSchema = commentRowSchema.omit({ user_id: true }).extend({
  penulis_nama: z.string(),
});

export const voteRowSchema = z.object({
  id: idSchema,
  user_id: z.string().uuid(),
  proposal_id: idSchema,
  dibuat_pada: timestampSchema,
});

export type CommentInput = z.infer<typeof commentInputSchema>;
export type CommentRow = z.infer<typeof commentRowSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type VoteRow = z.infer<typeof voteRowSchema>;
