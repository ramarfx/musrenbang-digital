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
