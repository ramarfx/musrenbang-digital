export const ALLOWED_PROJECT_REF = 'dogyibbzwfslspflsidm';
export const ALLOWED_PROJECT_URL = `https://${ALLOWED_PROJECT_REF}.supabase.co`;
export const FOUNDATION_MIGRATIONS = [
  '20261026090000',
  '20261026090100',
  '20261026090200',
  '20261026090300',
  '20261026195414',
  '20261027004023',
] as const;

export const POST_FOUNDATION_MIGRATIONS = [
  '20261027065525',
  '20261028135103',
  '20261102122158',
  '20261102141207',
  '20261103031212',
  '20261103100955',
  '20261103102540',
  '20261103104403',
  '20261103112104',
  '20261103154800',
  '20261103232447',
  '20261105024359',
  '20261105094232',
  '20261107094242',
] as const;
export const WRITE_TEST_MIGRATIONS = [
  ...FOUNDATION_MIGRATIONS,
  ...POST_FOUNDATION_MIGRATIONS,
] as const;

function hasExactMigrationHistory(versions: readonly string[], expected: readonly string[]) {
  const observed = [...versions].sort();
  const expectedSorted = [...expected].sort();
  return (
    observed.length === expectedSorted.length &&
    observed.every((version, index) => version === expectedSorted[index])
  );
}

export function classifyRemoteMigrationHistory(versions: readonly string[]) {
  if (hasExactMigrationHistory(versions, FOUNDATION_MIGRATIONS)) return 'foundation-only';
  if (hasExactMigrationHistory(versions, WRITE_TEST_MIGRATIONS)) return 'deployed-baseline';
  return 'unexpected';
}

export function assertExpectedMigrationHistory(
  versions: readonly string[],
  expected: readonly string[] = WRITE_TEST_MIGRATIONS,
) {
  if (!hasExactMigrationHistory(versions, expected)) {
    throw new Error(
      `Migration history tidak cocok. Diharapkan ${[...expected].join(',')}; ` +
        `ditemukan ${[...versions].sort().join(',') || '(kosong)'}.`,
    );
  }
}

export function shouldEnforceExpectedMigrationHistory(
  executeRemoteWrites: boolean,
  recovering: boolean,
) {
  return executeRemoteWrites && !recovering;
}

export type RunAuthorization = {
  projectRef: string;
  supabaseUrl: string;
  serviceKeyRef?: string;
  databaseHost?: string;
  executeRemoteWrites: boolean;
  confirmFixtureCleanup: boolean;
};

export function assertRemoteTarget(input: RunAuthorization) {
  const url = new URL(input.supabaseUrl);
  if (input.projectRef !== ALLOWED_PROJECT_REF) {
    throw new Error('Project ref di luar allowlist Musrenbang development.');
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== `${ALLOWED_PROJECT_REF}.supabase.co` ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('URL harus tepat menunjuk endpoint HTTPS project Musrenbang yang diizinkan.');
  }
  if (input.serviceKeyRef && input.serviceKeyRef !== ALLOWED_PROJECT_REF) {
    throw new Error('Referensi project pada credential tidak cocok dengan target.');
  }
  if (input.databaseHost && input.databaseHost !== `db.${ALLOWED_PROJECT_REF}.supabase.co`) {
    throw new Error(
      'Host database tidak cocok dengan project allowlist. Pooler/custom host ditolak.',
    );
  }
  if (input.executeRemoteWrites && !input.confirmFixtureCleanup) {
    throw new Error('Mode tulis memerlukan konfirmasi cleanup fixture.');
  }
}

export function extractJwtProjectRef(key: string): string | undefined {
  if (!key.startsWith('eyJ')) return undefined;
  const parts = key.split('.');
  if (parts.length !== 3) throw new Error('Format JWT API key tidak valid.');
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      ref?: unknown;
    };
    return typeof claims.ref === 'string' ? claims.ref : undefined;
  } catch {
    throw new Error('Claim API key tidak dapat diverifikasi.');
  }
}

export function sanitizeDiagnostic(error: unknown) {
  const candidate = error as { name?: unknown; code?: unknown; errno?: unknown } | null;
  return {
    type: typeof candidate?.name === 'string' ? candidate.name : 'Error',
    code:
      typeof candidate?.code === 'string'
        ? candidate.code
        : typeof candidate?.errno === 'string'
          ? candidate.errno
          : null,
  };
}

export type FixtureManifest = {
  version: 1;
  environment: 'remote-development' | 'local-integration';
  projectRef: string;
  runId: string;
  createdAt: string;
  status: 'running' | 'cleanup-required' | 'cleaned';
  users: {
    label: 'warga-a' | 'warga-b' | 'admin' | 'race';
    email: string;
    id?: string;
    deleted?: boolean;
  }[];
  proposals: {
    label: string;
    title: string;
    allowedTitles?: string[];
    ownerId: string;
    id?: number;
    deleted?: boolean;
  }[];
  cleanup: { proposals: boolean; users: boolean };
  baseline?: Record<string, { count: number; fingerprint: string }>;
  finalSnapshot?: Record<string, { count: number; fingerprint: string }>;
};

export function assertRecoveryManifest(
  value: unknown,
  expectedRunId: string,
): asserts value is FixtureManifest {
  const validRunId = validateRunId(expectedRunId);
  if (!value || typeof value !== 'object') {
    throw new Error('Manifest cleanup bukan objek yang valid.');
  }
  const manifest = value as Partial<FixtureManifest>;
  if (
    manifest.version !== 1 ||
    manifest.environment !== 'remote-development' ||
    manifest.projectRef !== ALLOWED_PROJECT_REF ||
    manifest.runId !== validRunId ||
    !['running', 'cleanup-required', 'cleaned'].includes(manifest.status ?? '') ||
    !Array.isArray(manifest.users) ||
    !Array.isArray(manifest.proposals) ||
    !manifest.cleanup ||
    typeof manifest.cleanup.proposals !== 'boolean' ||
    typeof manifest.cleanup.users !== 'boolean'
  ) {
    throw new Error('Manifest cleanup tidak cocok dengan project/run yang di-allowlist.');
  }
}

export function validateRunId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Run ID harus berupa UUID v4.');
  }
  return value.toLowerCase();
}
