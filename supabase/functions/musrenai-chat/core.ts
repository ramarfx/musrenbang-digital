import { routes } from './knowledge.ts';
import type { ChatInput, Provider } from './provider.ts';

type Dependencies = {
  authenticate: (token: string) => Promise<string | null>;
  consume: (userId: string) => Promise<string>;
  provider: Provider;
  reserveProvider: () => Promise<boolean>;
  faqApproved: boolean;
  origin: string;
  timeoutMs?: number;
  // Diagnostik operator: hanya nama tahap dan kode tetap, tidak pernah isi pesan atau jawaban.
  log?: (stage: string, code: string) => void;
};
export type ChatOutput = {
  answer: string;
  route_ids: (keyof typeof routes)[];
  disclaimer: string | null;
};
const error = (
  status: number,
  code: string,
  message: string,
  id: string,
  headers: HeadersInit = {},
) => Response.json({ error: { code, message, request_id: id } }, { status, headers });
const sensitive =
  /(?:\b\d{16}\b|\b(?:\+62|08)\d{8,13}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:nik|ktp)\s*[:#-]?\s*\d+)/i;
const unsafeOutput =
  /<[^>]*>|https?:\/\/|\bwww\.|javascript:|\b(?:judul|deskripsi)\s*(?:usulan)?\s*:/i;
const asksDraft =
  /\b(?:buat|tulis|susun|isikan|isi|kirim|ajukan|submit)\w*\s+(?:(?:judul|deskripsi|formulir|form|usulan)\b)/i;
const apbdNumber = /(?:\b\d[\d.,]*\s*(?:rupiah|rp|persen|%|triliun|miliar|juta)\b|\brp\s*\d)/i;
const isRecord = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);

// Tiap aturan punya kode tetap agar log menunjukkan bagian yang gagal tanpa mencatat isi.
export function validateOutput(result: unknown): ChatOutput {
  if (!isRecord(result)) throw new Error('not_object');
  const answer = result.answer;
  const routeIds = result.route_ids;
  const disclaimer = result.disclaimer ?? null;
  if (typeof answer !== 'string') throw new Error('answer_type');
  if (!answer.trim()) throw new Error('answer_empty');
  if (answer.length > 4000) throw new Error('answer_long');
  if (unsafeOutput.test(answer)) throw new Error('answer_unsafe');
  if (sensitive.test(answer)) throw new Error('answer_sensitive');
  if (/\bapbd\b/i.test(answer) && apbdNumber.test(answer)) throw new Error('answer_apbd_number');
  if (!Array.isArray(routeIds)) throw new Error('routes_type');
  if (routeIds.length > 3) throw new Error('routes_count');
  if (routeIds.some((r) => typeof r !== 'string' || !Object.hasOwn(routes, r)))
    throw new Error('routes_value');
  if (
    disclaimer !== null &&
    (typeof disclaimer !== 'string' ||
      disclaimer.length > 300 ||
      unsafeOutput.test(disclaimer) ||
      sensitive.test(disclaimer))
  )
    throw new Error('disclaimer_invalid');
  return { answer, route_ids: routeIds as ChatOutput['route_ids'], disclaimer };
}
export function parseInput(value: unknown): ChatInput | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((k) => !['message', 'history', 'client_request_id'].includes(k))
  )
    return null;
  if (typeof value.message !== 'string' || !value.message.trim() || value.message.length > 1500)
    return null;
  if (
    value.client_request_id !== undefined &&
    (typeof value.client_request_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value.client_request_id,
      ))
  )
    return null;
  const history = value.history ?? [];
  if (
    !Array.isArray(history) ||
    history.length > 6 ||
    history.some(
      (h) =>
        !isRecord(h) ||
        Object.keys(h).some((k) => !['role', 'content'].includes(k)) ||
        !['user', 'assistant'].includes(String(h.role)) ||
        typeof h.content !== 'string' ||
        !h.content.trim() ||
        h.content.length > 1500,
    )
  )
    return null;
  if (
    [value.message, ...history.map((h) => h.content as string)].some((text) => sensitive.test(text))
  )
    return null;
  return {
    message: value.message.trim(),
    history: history as ChatInput['history'],
    ...(typeof value.client_request_id === 'string'
      ? { client_request_id: value.client_request_id }
      : {}),
  };
}
export function createHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const id = crypto.randomUUID();
    const origin = request.headers.get('origin');
    const cors: Record<string, string> = { Vary: 'Origin', 'Cache-Control': 'no-store' };
    if (origin && origin === deps.origin) {
      cors['Access-Control-Allow-Origin'] = origin;
      cors['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
      cors['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    }
    if (origin && origin !== deps.origin)
      return error(403, 'ORIGIN_DENIED', 'Asal permintaan tidak diizinkan.', id, cors);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST')
      return error(405, 'METHOD_NOT_ALLOWED', 'Metode tidak diizinkan.', id, cors);
    const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
    if (!token) return error(401, 'AUTH_REQUIRED', 'Silakan masuk terlebih dahulu.', id, cors);
    let uid: string | null;
    try {
      uid = await deps.authenticate(token);
    } catch {
      return error(503, 'AUTH_UNAVAILABLE', 'Autentikasi sementara tidak tersedia.', id, cors);
    }
    if (!uid) return error(401, 'AUTH_REQUIRED', 'Sesi tidak valid atau kedaluwarsa.', id, cors);
    if (!deps.faqApproved)
      return error(503, 'AI_UNAVAILABLE', 'MusrenAI belum tersedia.', id, cors);
    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json'))
      return error(400, 'INVALID_INPUT', 'Kirim pesan dalam format JSON.', id, cors);
    let input: ChatInput | null = null;
    try {
      const reader = request.body?.getReader();
      if (!reader) throw new Error('missing body');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 12000) {
          await reader.cancel();
          throw new Error('body too large');
        }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      input = parseInput(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
    } catch {
      /* invalid request */
    }
    if (!input)
      return error(
        400,
        'INVALID_INPUT',
        'Pesan tidak valid atau mengandung data pribadi. Gunakan penjelasan umum.',
        id,
        cors,
      );
    let quota: string;
    try {
      quota = await deps.consume(uid);
    } catch {
      return error(503, 'AI_UNAVAILABLE', 'MusrenAI sementara tidak tersedia.', id, cors);
    }
    if (['minute', 'day', 'global'].includes(quota))
      return error(
        429,
        'RATE_LIMITED',
        'Batas permintaan tercapai. Silakan coba lagi nanti.',
        id,
        cors,
      );
    if (quota !== 'ok')
      return error(503, 'AI_UNAVAILABLE', 'MusrenAI sementara tidak tersedia.', id, cors);
    if (asksDraft.test(input.message))
      return Response.json(
        {
          answer:
            'Saya bisa membantu menjelaskan langkah pengajuan atau memberi ide, tetapi tidak dapat menulis isi formulir atau mengirim usulan untuk Anda.',
          links: [routes.buat_usulan],
          disclaimer: null,
          request_id: id,
        },
        { headers: cors },
      );
    try {
      if (!(await deps.reserveProvider()))
        return error(
          429,
          'PROVIDER_LIMITED',
          'MusrenAI sementara mencapai batas layanan.',
          id,
          cors,
        );
    } catch {
      return error(503, 'AI_UNAVAILABLE', 'MusrenAI sementara tidak tersedia.', id, cors);
    }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), deps.timeoutMs ?? 15000);
    const unavailable = () =>
      error(
        abort.signal.aborted ? 504 : 503,
        abort.signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE',
        'MusrenAI sementara tidak tersedia. Silakan coba lagi.',
        id,
        cors,
      );
    let result: unknown;
    try {
      result = await Promise.race([
        deps.provider(input, abort.signal),
        new Promise<never>((_, reject) =>
          abort.signal.addEventListener('abort', () => reject(new Error('timeout')), {
            once: true,
          }),
        ),
      ]);
    } catch {
      deps.log?.('provider', abort.signal.aborted ? 'timeout' : 'unavailable');
      return unavailable();
    } finally {
      clearTimeout(timer);
    }
    let output: ChatOutput;
    try {
      output = validateOutput(result);
    } catch (failure) {
      const rule =
        failure instanceof Error && /^[a-z_]{1,20}$/.test(failure.message)
          ? failure.message
          : 'unknown';
      deps.log?.('output', rule);
      // Angka APBD dari model tidak diteruskan; arahkan warga ke data bersumber di /apbd.
      if (rule === 'answer_apbd_number')
        return Response.json(
          {
            answer:
              'Angka APBD per kategori bisa dilihat langsung di halaman APBD, lengkap dengan sumber resminya. Saya tidak menyebutkan angkanya di sini agar tidak keliru.',
            links: [routes.apbd, routes.bandingkan],
            disclaimer: null,
            request_id: id,
          },
          { headers: cors },
        );
      return unavailable();
    }
    const links = [...new Set(output.route_ids)].map((route) => routes[route]);
    return Response.json(
      { answer: output.answer, links, disclaimer: output.disclaimer, request_id: id },
      { headers: cors },
    );
  };
}
