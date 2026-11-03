import { SQL } from 'bun';
import { validateLocalDatabaseUrl } from '../musrenai-admin/local-worker';
import { processOne, type Narrative, type SummaryJob, type SummaryQueue } from './core';

export function createLocalSummaryQueue(sql: SQL): SummaryQueue {
  return {
    async claim() {
      const rows = await sql`SELECT * FROM private.claim_aspiration_summary()`;
      if (!rows.length) return null;
      const row = rows[0];
      const id = Number(row.summary_id);
      if (
        !Number.isSafeInteger(id) ||
        id < 1 ||
        typeof row.token !== 'string' ||
        !Array.isArray(row.sources) ||
        !['sample', 'complete'].includes(row.coverage)
      )
        throw new Error('invalid job');
      const sources = row.sources.map((s: { id: unknown; kategori: unknown }) => {
        const sourceId = Number(s.id);
        if (!Number.isSafeInteger(sourceId) || sourceId < 1 || typeof s.kategori !== 'string')
          throw new Error('invalid source');
        return { id: sourceId, kategori: s.kategori };
      });
      return { id, token: row.token, sources, coverage: row.coverage } as SummaryJob;
    },
    async reserve() {
      const rows = await sql`SELECT public.reserve_musrenai_provider_attempt('admin') AS allowed`;
      return rows[0]?.allowed === true;
    },
    async finish(job: SummaryJob, narrative: Narrative | null) {
      const data = narrative === null ? null : JSON.stringify(narrative);
      await sql`SELECT private.finish_aspiration_summary(${job.id}, ${job.token}::uuid, (${data}::text)::jsonb, ${narrative === null})`;
    },
  };
}

// Local only; the default provider is an in-process mock and never uses the network.
if (import.meta.main) {
  let sql: SQL | undefined;
  try {
    sql = new SQL(validateLocalDatabaseUrl(process.env.MUSRENAI_LOCAL_DATABASE_URL ?? ''));
    const processed = await processOne(createLocalSummaryQueue(sql));
    console.log(processed ? 'Satu ringkasan diproses.' : 'Tidak ada ringkasan menunggu.');
  } catch {
    console.error('Worker lokal gagal. Periksa konfigurasi dan database pengujian.');
    process.exitCode = 1;
  } finally {
    if (sql) await sql.close().catch(() => undefined);
  }
}
