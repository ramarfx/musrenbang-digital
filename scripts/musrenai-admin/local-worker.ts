import { SQL } from 'bun';
import { runOnce, type Job, type Queue, type Result } from './worker';

export function validateLocalDatabaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Konfigurasi database lokal tidak valid.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !/^\/musrenai_admin_test_[a-z0-9_]+$/.test(url.pathname) ||
    url.search ||
    url.hash
  )
    throw new Error('Hanya database pengujian MusrenAI lokal yang diizinkan.');
  return value;
}

export function createLocalQueue(sql: SQL): Queue {
  return {
    async claim() {
      const rows = await sql`SELECT * FROM private.claim_proposal_ai()`;
      if (!rows.length) return null;
      const row = rows[0];
      const reviewId = Number(row.review_id);
      if (!Number.isSafeInteger(reviewId) || reviewId < 1 || typeof row.token !== 'string') {
        throw new Error('Lease database tidak valid.');
      }
      return {
        reviewId,
        token: row.token,
        judul: row.judul,
        deskripsi: row.deskripsi,
        kategori: row.kategori,
      } as Job;
    },
    async finish(job: Job, result: Result | null) {
      const flags = result ? JSON.stringify(result.flags) : '[]';
      await sql`SELECT private.finish_proposal_ai(${job.reviewId}, ${job.token}::uuid, (${flags}::text)::jsonb, ${result?.reason ?? null}, ${result?.model ?? null}, ${result === null})`;
    },
  };
}

// Local test harness only. It has no provider configuration or remote target override.
if (import.meta.main) {
  let sql: SQL | undefined;
  try {
    const url = validateLocalDatabaseUrl(process.env.MUSRENAI_LOCAL_DATABASE_URL ?? '');
    sql = new SQL(url);
    const processed = await runOnce(createLocalQueue(sql));
    console.log(processed ? 'Satu pekerjaan diproses.' : 'Antrean kosong.');
  } catch {
    console.error('Worker lokal gagal. Periksa konfigurasi dan status database lokal.');
    process.exitCode = 1;
  } finally {
    if (sql) await sql.close().catch(() => undefined);
  }
}
