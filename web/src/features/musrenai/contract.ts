import { z } from 'zod';
const allowedPaths = new Set([
  '/usulan',
  '/usulan/baru',
  '/usulan-saya',
  '/simulator',
  '/apbd',
  '/bandingkan',
  '/metodologi',
  '/login',
]);
const responseSchema = z.object({
  answer: z.string().min(1).max(4000),
  links: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        path: z.string().refine((path) => allowedPaths.has(path)),
        requires_auth: z.boolean(),
      }),
    )
    .max(3),
  disclaimer: z.string().max(300).nullable(),
  request_id: z.string(),
});
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ChatResponse = z.infer<typeof responseSchema>;

export function parseChatResponse(data: unknown): ChatResponse {
  return responseSchema.parse(data);
}

export function chatErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Pesan tidak valid atau mengandung data pribadi.';
    case 401:
      return 'Sesi telah berakhir. Silakan masuk kembali.';
    case 403:
      return 'Akses MusrenAI ditolak. Silakan buka dari website resmi.';
    case 429:
      return 'Batas permintaan tercapai. Silakan coba lagi nanti.';
    case 504:
      return 'Jawaban terlalu lama. Silakan coba lagi.';
    case 503:
      return 'MusrenAI sementara tidak tersedia. Silakan coba lagi nanti.';
    default:
      return 'MusrenAI belum tersedia. Silakan coba lagi nanti.';
  }
}
