import { redact } from '../_shared/pii.ts';

export type CostHint = { min: number; max: number; alasan: string };
export type HintInput = { judul: string; deskripsi: string; kategori: string };

type Dependencies = {
  origin: string;
  authenticate: (token: string) => Promise<string | null>;
  consume: (userId: string) => Promise<string>;
  reserve: () => Promise<boolean>;
  suggest: (input: HintInput) => Promise<unknown>;
  log?: (stage: string, code: string) => void;
  wait?: (ms: number) => Promise<void>;
};

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Hanya gangguan sesaat: 5xx penyedia atau kegagalan jaringan. Bukan 4xx atau respons rusak.
function retryable(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : '';
  return /^provider_status=(500|502|503|504)$/.test(message);
}

const MIN_RP = 100_000;
const MAX_RP = 100_000_000_000;
const MAX_RATIO = 10;
const unsafeText = /<[^>]*>|https?:\/\/|\bwww\.|javascript:/i;

export { redact };

const isRecord = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);

export function parseInput(value: unknown): HintInput | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((k) => !['judul', 'deskripsi', 'kategori'].includes(k))
  )
    return null;
  const { judul, deskripsi, kategori } = value;
  if (
    typeof judul !== 'string' ||
    typeof deskripsi !== 'string' ||
    typeof kategori !== 'string' ||
    judul.trim().length < 3 ||
    judul.length > 200 ||
    deskripsi.trim().length < 10 ||
    deskripsi.length > 2000 ||
    kategori.trim().length < 1 ||
    kategori.length > 100
  )
    return null;
  return { judul: judul.trim(), deskripsi: deskripsi.trim(), kategori: kategori.trim() };
}

// Balasan model harus berupa rentang yang masuk akal; angka pasti atau terbalik ditolak.
export function validateHint(value: unknown): CostHint {
  if (!isRecord(value)) throw new Error('bad_schema');
  const { min, max, alasan } = value;
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    (min as number) < MIN_RP ||
    (max as number) > MAX_RP ||
    (min as number) >= (max as number) ||
    (max as number) > (min as number) * MAX_RATIO ||
    typeof alasan !== 'string' ||
    alasan.trim().length < 1 ||
    alasan.length > 300 ||
    unsafeText.test(alasan)
  )
    throw new Error('bad_schema');
  return { min: min as number, max: max as number, alasan: alasan.trim() };
}

export function createHandler(d: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Vary: 'Origin',
      'Cache-Control': 'no-store',
    };
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
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return reply(400, { error: 'Data usulan tidak valid.' });
      }
      const input = parseInput(body);
      if (!input) return reply(400, { error: 'Isi judul, deskripsi, dan kategori dengan benar.' });
      const quota = await d.consume(user);
      if (['minute', 'day', 'global'].includes(quota))
        return reply(429, { error: 'Batas permintaan tercapai. Coba lagi nanti.' });
      if (quota !== 'ok') return reply(503, { error: 'Saran biaya sementara tidak tersedia.' });
      if (!(await d.reserve())) {
        d.log?.('reserve', 'quota');
        return reply(429, { error: 'Layanan sementara mencapai batas. Coba lagi nanti.' });
      }
      const redacted = {
        judul: redact(input.judul),
        deskripsi: redact(input.deskripsi),
        kategori: redact(input.kategori),
      };
      let hint: CostHint;
      try {
        // Satu ulangan untuk gangguan sesaat penyedia; tiap percobaan memakai kuota bersama.
        let raw: unknown;
        for (let attempt = 0; ; attempt++) {
          if (attempt > 0 && !(await d.reserve())) throw new Error('quota');
          try {
            raw = await d.suggest(redacted);
            break;
          } catch (error) {
            if (attempt > 0 || !retryable(error)) throw error;
            const message = error instanceof Error ? error.message : '';
            d.log?.('suggest_retry', /^[a-z0-9_=:.-]{1,60}$/.test(message) ? message : 'unknown');
            await (d.wait ?? defaultWait)(200 + Math.floor(Math.random() * 200));
          }
        }
        hint = validateHint(raw);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        d.log?.('suggest', /^[a-z0-9_=:.-]{1,60}$/.test(message) ? message : 'unknown');
        return reply(503, { error: 'Saran biaya sementara tidak tersedia.' });
      }
      return reply(200, {
        ...hint,
        label: 'Perkiraan AI, bukan angka resmi. Silakan periksa dan ubah sesuai kebutuhan.',
      });
    } catch {
      return reply(503, { error: 'Saran biaya sementara tidak tersedia.' });
    }
  };
}
