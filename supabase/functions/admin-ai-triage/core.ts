import { redact } from '../_shared/pii.ts';

export type Review = { flags: string[]; reason: string; model: string };
type Job = { review_id: number; token: string; judul: string; deskripsi: string; kategori: string };
type Dependencies = {
  origin: string;
  authenticate: (token: string) => Promise<string | null>;
  claim: (id: string, proposal: number) => Promise<Job | null>;
  reserve: () => Promise<boolean>;
  analyze: (job: Pick<Job, 'judul' | 'deskripsi' | 'kategori'>) => Promise<Review>;
  finish: (id: string, job: Job, result: Review | null) => Promise<string>;
  // Diagnostik operator: hanya nama tahap dan kode tetap, tidak pernah isi usulan.
  log?: (stage: string, code: string) => void;
  wait?: (ms: number) => Promise<void>;
};

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Hanya gangguan sesaat: 5xx penyedia atau kegagalan jaringan. Bukan 429, 4xx, atau respons rusak.
function retryable(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : '';
  return /^provider_status=(500|502|503|504)$/.test(message);
}

// Hanya kode pendek bercirikan huruf kecil, angka, dan _=:.- yang boleh dicatat.
function safeCode(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') return 'timeout';
  const message = error instanceof Error ? error.message : '';
  return /^[a-z0-9_=:.-]{1,60}$/.test(message) ? message : 'unknown';
}

export { redact };

export const ALLOWED_FLAGS = ['spam', 'promotion', 'irrelevant', 'needs_review'];

// Tiap aturan punya kode tetap agar log menunjukkan bagian yang gagal tanpa mencatat isi.
export function validateReview(value: unknown, model: string): Review {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not_object');
  const item = value as Record<string, unknown>;
  const flags = item.flags;
  if (!Array.isArray(flags)) throw new Error('flags_type');
  if (flags.length > 3) throw new Error('flags_count');
  if (flags.some((x) => typeof x !== 'string' || !ALLOWED_FLAGS.includes(x)))
    throw new Error('flags_value');
  if (new Set(flags).size !== flags.length) throw new Error('flags_duplicate');
  if (typeof item.reason !== 'string') throw new Error('reason_type');
  if (item.reason.trim().length < 1) throw new Error('reason_empty');
  if (item.reason.length > 500) throw new Error('reason_long');
  return { flags, reason: item.reason.trim(), model };
}

export function createHandler(d: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Vary: 'Origin' };
    if (origin && origin !== d.origin) return new Response(null, { status: 403, headers });
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const reply = (status: number, body: object) =>
      new Response(JSON.stringify(body), { status, headers });
    if (request.method !== 'POST') return reply(405, { error: 'Metode tidak tersedia.' });
    try {
      const authorization = request.headers.get('authorization') ?? '';
      if (!authorization.startsWith('Bearer ')) return reply(401, { error: 'Login diperlukan.' });
      const user = await d.authenticate(authorization.slice(7));
      if (!user) return reply(401, { error: 'Sesi tidak valid.' });
      let body: { proposal_id?: unknown };
      try {
        body = await request.json();
      } catch {
        return reply(400, { error: 'Usulan tidak valid.' });
      }
      if (!Number.isSafeInteger(body?.proposal_id) || (body.proposal_id as number) < 1)
        return reply(400, { error: 'Usulan tidak valid.' });
      const job = await d.claim(user, body.proposal_id as number);
      if (!job) return reply(200, { state: 'completed' });
      let result: Review | null = null;
      let stage = 'reserve';
      try {
        const input = {
          judul: redact(job.judul),
          deskripsi: redact(job.deskripsi),
          kategori: redact(job.kategori),
        };
        // Satu ulangan untuk gangguan sesaat penyedia; tiap percobaan memakai kuota bersama.
        for (let attempt = 0; result === null; attempt++) {
          stage = 'reserve';
          if (!(await d.reserve())) throw new Error('quota');
          stage = 'analyze';
          try {
            result = await d.analyze(input);
          } catch (error) {
            if (attempt > 0 || !retryable(error)) throw error;
            d.log?.('analyze_retry', safeCode(error));
            await (d.wait ?? defaultWait)(200 + Math.floor(Math.random() * 200));
          }
        }
      } catch (error) {
        d.log?.(stage, safeCode(error));
        await d.finish(user, job, null);
        return reply(503, { error: 'Analisis sementara tidak tersedia.' });
      }
      const state = await d.finish(user, job, result);
      return reply(200, { state });
    } catch (error) {
      // Kode dari rpc(): hanya penolakan peran yang menjadi 403; sisanya bukan soal hak akses.
      const code = error instanceof Error ? error.message : '';
      if (code === 'forbidden')
        return reply(403, { error: 'Hanya admin yang dapat menganalisis.' });
      if (code === 'busy') return reply(409, { error: 'Analisis usulan ini sedang diproses.' });
      if (code === 'not_found') return reply(404, { error: 'Usulan tidak ditemukan.' });
      return reply(503, { error: 'Analisis sementara tidak tersedia.' });
    }
  };
}
