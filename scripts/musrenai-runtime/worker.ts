import { SQL } from 'bun';
import { createLocalQueue } from '../musrenai-admin/local-worker';
import { runOnce, type Job, type Result } from '../musrenai-admin/worker';
import { createLocalSummaryQueue } from '../musrenai-summary/local-worker';
import { processOne, type Narrative, type SummaryJob } from '../musrenai-summary/core';
import { parseConfig, tick, type RuntimeConfig, type WorkerActions } from './config';
import { mockAdminContentProvider } from './admin-provider';

export function createActions(sql: SQL): WorkerActions {
  async function scoped<T>(operation: (connection: SQL) => Promise<T>): Promise<T> {
    return (await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE musrenai_worker_runtime`;
      return operation(tx as unknown as SQL);
    })) as T;
  }
  const proposalQueue = {
    claim: () => scoped((db) => createLocalQueue(db).claim()),
    finish: (job: Job, result: Result | null) =>
      scoped((db) => createLocalQueue(db).finish(job, result)),
  };
  const summaryQueue = {
    claim: () => scoped((db) => createLocalSummaryQueue(db).claim()),
    // Mock runs locally in-process and do not consume a real provider attempt.
    reserve: async () => true,
    finish: (job: SummaryJob, result: Narrative | null) =>
      scoped((db) => createLocalSummaryQueue(db).finish(job, result)),
  };
  return {
    async reconcile() {
      await scoped(async (db) => {
        await db`SELECT private.reconcile_proposal_ai(100)`;
      });
    },
    async proposal() {
      await runOnce(proposalQueue, (job) =>
        mockAdminContentProvider(
          { title: job.judul, description: job.deskripsi, category: job.kategori },
          new AbortController().signal,
        ),
      );
    },
    async summary() {
      await processOne(summaryQueue);
    },
    async prune(days) {
      await scoped(async (db) => {
        await db`SELECT private.prune_aspiration_summaries(now() - ${days} * interval '1 day',100)`;
      });
    },
  };
}

export async function verifyLogin(sql: SQL): Promise<void> {
  const rows =
    await sql`SELECT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcreatedb AND NOT r.rolcreaterole AND NOT r.rolinherit
    AND pg_has_role(current_user,'musrenai_worker_runtime','MEMBER')
    AND NOT has_table_privilege(current_user,'public.proposals','SELECT')
    AND NOT has_table_privilege(current_user,'public.proposals','UPDATE')
    AND NOT has_function_privilege(current_user,'public.moderate_proposal(bigint,text,text)','EXECUTE')
    AND NOT EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles p ON p.oid=m.member WHERE p.rolname='musrenai_worker_runtime')
    AND NOT EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles p ON p.oid=m.roleid WHERE m.member=r.oid AND p.rolname<>'musrenai_worker_runtime') AS safe
    FROM pg_roles r WHERE r.rolname=current_user`;
  if (rows[0]?.safe !== true) throw new Error('worker identity invalid');
}

export async function runScheduler(
  config: RuntimeConfig,
  actions: WorkerActions,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted && config.enabled) {
    await tick(config, actions);
    if (signal.aborted) break;
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, config.intervalMs);
      signal.addEventListener('abort', done, { once: true });
      if (signal.aborted) done();
    });
  }
}

if (import.meta.main) {
  let sql: SQL | undefined;
  try {
    const config = parseConfig(process.env);
    if (!config.enabled) console.log('Worker nonaktif.');
    else {
      if (!config.databaseUrl) throw new Error('worker configuration invalid');
      sql = new SQL(config.databaseUrl, {
        max: 1,
        connectionTimeout: 5,
        tls: { rejectUnauthorized: true },
      });
      await verifyLogin(sql);
      const controller = new AbortController();
      process.once('SIGINT', () => controller.abort());
      process.once('SIGTERM', () => controller.abort());
      console.log('Worker mock siap; hanya ringkasan dan flag mock yang diproses.');
      await runScheduler(config, createActions(sql), controller.signal);
    }
  } catch {
    console.error('Worker dihentikan karena konfigurasi atau layanan tidak tersedia.');
    process.exitCode = 1;
  } finally {
    if (sql) await sql.close().catch(() => undefined);
  }
}
