export type RuntimeConfig = {
  enabled: boolean;
  databaseUrl?: string;
  intervalMs: number;
  retentionDays: number | null;
  basicLog: boolean;
};

// This project is explicitly out of scope for execution until a separate activation review.
const blockedProject = 'dogyibbzwfslspflsidm';
export function parseConfig(env: Record<string, string | undefined>): RuntimeConfig {
  const disabled: RuntimeConfig = {
    enabled: false,
    intervalMs: 60000,
    retentionDays: null,
    basicLog: false,
  };
  if (env.MUSRENAI_WORKER_ENABLED !== 'true') return disabled;
  if (env.MUSRENAI_WORKER_MODE !== 'mock') throw new Error('worker configuration invalid');
  const ref = env.MUSRENAI_WORKER_PROJECT_REF ?? '';
  if (!/^[a-z]{20}$/.test(ref) || ref === blockedProject) throw new Error('worker target denied');
  let url: URL;
  try {
    url = new URL(env.MUSRENAI_WORKER_DATABASE_URL ?? '');
  } catch {
    throw new Error('worker configuration invalid');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.hostname !== `db.${ref}.supabase.co` ||
    decodeURIComponent(url.username) !== 'musrenai_worker_login' ||
    !url.password ||
    url.pathname !== '/postgres' ||
    url.search ||
    url.hash
  )
    throw new Error('worker target denied');
  const seconds = Number(env.MUSRENAI_WORKER_INTERVAL_SECONDS ?? '60');
  if (!Number.isInteger(seconds) || seconds < 30 || seconds > 3600)
    throw new Error('worker configuration invalid');
  let retentionDays: number | null = null;
  if (env.MUSRENAI_RETENTION_ENABLED === 'true') {
    retentionDays = Number(env.MUSRENAI_RETENTION_DAYS);
    if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 3650)
      throw new Error('worker configuration invalid');
  }
  const logLevel = env.MUSRENAI_WORKER_LOG_LEVEL ?? 'off';
  if (!['off', 'basic'].includes(logLevel)) throw new Error('worker configuration invalid');
  return {
    enabled: true,
    databaseUrl: url.toString(),
    intervalMs: seconds * 1000,
    retentionDays,
    basicLog: logLevel === 'basic',
  };
}

export interface WorkerActions {
  reconcile(): Promise<void>;
  proposal(): Promise<void>;
  summary(): Promise<void>;
  prune(days: number): Promise<void>;
}
export async function tick(config: RuntimeConfig, actions: WorkerActions): Promise<boolean> {
  if (!config.enabled) return false;
  await actions.reconcile();
  await actions.proposal();
  await actions.summary();
  if (config.retentionDays !== null) await actions.prune(config.retentionDays);
  return true;
}
