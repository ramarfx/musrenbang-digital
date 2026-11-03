export type Flag = 'spam' | 'promotion' | 'irrelevant' | 'needs_review';
export type Result = { flags: Flag[]; reason: string; model: string | null };
export type Job = {
  reviewId: number;
  token: string;
  judul: string;
  deskripsi: string;
  kategori: string;
};
export interface Queue {
  claim(): Promise<Job | null>;
  finish(job: Job, result: Result | null): Promise<void>;
}
export type Provider = (job: Job) => Promise<unknown>;

export function validateResult(input: unknown): Result {
  if (!input || typeof input !== 'object') throw new Error('invalid result');
  const r = input as Record<string, unknown>;
  const allowed = ['spam', 'promotion', 'irrelevant', 'needs_review'];
  if (
    !Array.isArray(r.flags) ||
    r.flags.length > 3 ||
    r.flags.some((f) => !allowed.includes(f)) ||
    typeof r.reason !== 'string' ||
    r.reason.trim().length < 1 ||
    r.reason.length > 500 ||
    (r.model !== null && (typeof r.model !== 'string' || r.model.length > 80))
  )
    throw new Error('invalid result');
  return { flags: r.flags as Flag[], reason: r.reason.trim(), model: r.model as string | null };
}

export function rules(job: Job): Result | null {
  const text = `${job.judul} ${job.deskripsi}`;
  if (/\b(?:beli sekarang|promo diskon|hubungi sales)\b/i.test(text))
    return {
      flags: ['promotion', 'needs_review'],
      reason: 'Terdapat frasa yang mungkin berupa promosi; perlu tinjauan admin.',
      model: null,
    };
  return null;
}

// No provider is configured by default. The injected gateway must enforce shared provider quota.
export async function runOnce(queue: Queue, provider?: Provider): Promise<boolean> {
  const job = await queue.claim();
  if (!job) return false;
  let result: Result | null;
  try {
    result =
      rules(job) ??
      (provider
        ? validateResult(await provider(job))
        : {
            flags: ['needs_review'],
            reason: 'Pemeriksaan otomatis tidak cukup untuk menyimpulkan; perlu tinjauan admin.',
            model: null,
          });
  } catch {
    result = null;
  }
  // A failed or uncertain database acknowledgement must never be retried as a new outcome.
  await queue.finish(job, result);
  return true;
}
