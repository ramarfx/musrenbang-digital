export type Source = { id: number; kategori: string };
export type Theme = { topic: string; explanation: string; source_ids: number[] };
export type Narrative = { themes: Theme[]; limitations: string };
export type SummaryJob = {
  id: number;
  token: string;
  sources: Source[];
  coverage: 'sample' | 'complete';
};
export interface SummaryQueue {
  claim(): Promise<SummaryJob | null>;
  reserve(): Promise<boolean>;
  finish(job: SummaryJob, narrative: Narrative | null): Promise<void>;
}
export type MockProvider = (
  sources: Source[],
  coverage: 'sample' | 'complete',
) => Promise<Narrative>;

export function mockNarrative(sources: Source[], coverage: 'sample' | 'complete'): Narrative {
  const categories = [...new Set(sources.map((s) => s.kategori))].slice(0, 3);
  return {
    themes: categories.map((category) => ({
      topic: category,
      explanation: 'Usulan dalam kategori ini memerlukan tinjauan admin.',
      source_ids: sources.filter((s) => s.kategori === category).map((s) => s.id),
    })),
    limitations:
      sources.length === 0
        ? 'Data belum mencukupi untuk merangkum aspirasi.'
        : coverage === 'sample'
          ? 'Ringkasan berdasarkan sampel dan tidak mewakili seluruh usulan.'
          : 'Ringkasan membantu tinjauan dan bukan keputusan moderasi.',
  };
}

export function validateNarrative(value: Narrative, sources: Source[]): Narrative {
  if (
    !value ||
    !Array.isArray(value.themes) ||
    value.themes.length > 10 ||
    typeof value.limitations !== 'string' ||
    value.limitations.length > 500 ||
    /\d/.test(value.limitations)
  )
    throw new Error('invalid narrative');
  const ids = new Set(sources.map((s) => s.id));
  for (const t of value.themes) {
    if (
      !t ||
      typeof t.topic !== 'string' ||
      !t.topic.trim() ||
      t.topic.length > 120 ||
      typeof t.explanation !== 'string' ||
      !t.explanation.trim() ||
      t.explanation.length > 500 ||
      /\d/.test(t.topic + t.explanation) ||
      !Array.isArray(t.source_ids) ||
      t.source_ids.length < 1 ||
      t.source_ids.length > 100 ||
      t.source_ids.some((id) => !Number.isSafeInteger(id) || !ids.has(id))
    )
      throw new Error('invalid narrative');
  }
  return value;
}

export async function processOne(
  queue: SummaryQueue,
  provider: MockProvider = async (s, c) => mockNarrative(s, c),
  timeoutMs = 5000,
): Promise<boolean> {
  const job = await queue.claim();
  if (!job) return false;
  let output: Narrative | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!job.sources.length) output = mockNarrative([], job.coverage);
    else {
      if (!(await queue.reserve())) throw new Error('provider unavailable');
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      });
      output = validateNarrative(
        await Promise.race([provider(job.sources, job.coverage), timeout]),
        job.sources,
      );
    }
  } catch {
    output = null;
  } finally {
    if (timer) clearTimeout(timer);
  }
  await queue.finish(job, output);
  return true;
}
