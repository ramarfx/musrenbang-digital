import { SQL } from 'bun';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cleanupManifest } from '../remote-integration/cleanup';
import { apiHeaders } from '../remote-integration/http';
import { snapshotApplicationTables } from '../remote-integration/snapshot';
import { runTrackedWrite } from '../remote-integration/tracking';
import { writeManifestAtomically } from '../remote-integration/manifest';
import type { FixtureManifest } from '../remote-integration/safety';

export const apiUrl = 'http://127.0.0.1:55421';
const mailUrl = 'http://127.0.0.1:55424';
const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const anonKey = process.env.INTEGRATION_ANON_KEY;
const serviceRoleKey = process.env.INTEGRATION_SERVICE_ROLE_KEY;
if (!databaseUrl || !anonKey || !serviceRoleKey)
  throw new Error('Jalankan melalui scripts/test-integration.ps1.');
const target = new URL(databaseUrl);
if (target.hostname !== '127.0.0.1' || target.port !== '55422' || target.pathname !== '/postgres') {
  throw new Error('Runner hanya menerima database integration lokal pada port 55422.');
}
export const db = new SQL(databaseUrl, { max: 4, connectionTimeout: 5 });
export const runId = crypto.randomUUID();
export type Actor = { id: string; email: string; token: string; refresh: string };
export type Session = { access_token: string; refresh_token: string; user: { id: string } };
type HttpResult<T> = { status: number; data: T };
const results: { name: string; passed: boolean }[] = [];
export const fixtures = {
  messages: [] as string[],
};
export const fixtureManifest: FixtureManifest = {
  version: 1,
  environment: 'local-integration',
  projectRef: 'musrenbang-integration',
  runId,
  createdAt: new Date().toISOString(),
  status: 'running',
  users: [],
  proposals: [],
  cleanup: { proposals: false, users: false },
};
const fixtureDirectory = join(import.meta.dir, '../../.tmp/integration-fixtures');
const fixturePath = join(fixtureDirectory, `${runId}.json`);

export async function persistFixtureManifest() {
  await mkdir(fixtureDirectory, { recursive: true });
  await writeManifestAtomically(fixturePath, fixtureManifest);
}

export async function beginFixtureRun() {
  fixtureManifest.baseline = await snapshotApplicationTables(db);
  await persistFixtureManifest();
}

export function check(name: string, condition: boolean) {
  results.push({ name, passed: condition });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`);
  if (!condition) throw new Error(name);
}

export async function request<T = unknown>(
  path: string,
  actor: Actor | null = null,
  method = 'GET',
  body?: unknown,
): Promise<HttpResult<T>> {
  const options: RequestInit = {
    method,
    headers: apiHeaders(anonKey!, actor?.token),
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  };
  if (body !== undefined) options.body = JSON.stringify(body);
  const response = await fetch(apiUrl + path, options);
  const text = await response.text();
  if (path.startsWith('/rest/v1/rpc/')) {
    const code = text ? (JSON.parse(text) as { code?: string }).code : undefined;
    console.log(
      `RPC ${path.split('/').at(-1)} HTTP ${response.status}${code ? ` SQLSTATE ${code}` : ''}`,
    );
  }
  return { status: response.status, data: (text ? JSON.parse(text) : null) as T };
}

export async function adminRequest<T = unknown>(
  path: string,
  method = 'GET',
): Promise<HttpResult<T>> {
  const response = await fetch(apiUrl + path, {
    method,
    headers: apiHeaders(serviceRoleKey!),
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  return { status: response.status, data: (text ? JSON.parse(text) : null) as T };
}

export async function rows(path: string, actor: Actor | null) {
  const response = await request<Record<string, unknown>[]>(`/rest/v1/${path}`, actor);
  check(
    `GET ${path.split('?')[0]} berhasil`,
    response.status === 200 && Array.isArray(response.data),
  );
  return response.data;
}

export async function denied(
  name: string,
  path: string,
  actor: Actor | null,
  method: string,
  body?: unknown,
) {
  const response = await request<{ code?: string }>(path, actor, method, body);
  check(name, [401, 403].includes(response.status));
  return response;
}

export async function poll<T>(read: () => Promise<T | undefined>, timeout = 10000): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await read();
    if (value !== undefined) return value;
    await Bun.sleep(100);
  }
  throw new Error('Polling lokal melewati batas waktu.');
}

export async function signup(
  label: string,
  password: string,
  metadata: Record<string, string>,
): Promise<Actor> {
  const email = `integration-${runId}-${label}@example.test`;
  const fixture: FixtureManifest['users'][number] = {
    label: label as 'warga-a' | 'warga-b' | 'admin' | 'race',
    email,
  };
  fixtureManifest.users.push(fixture);
  const signupResponse = await runTrackedWrite({
    entry: fixture,
    persist: persistFixtureManifest,
    create: () =>
      request<{
        id?: string;
        user?: { id: string };
        access_token?: string;
      }>('/auth/v1/signup', null, 'POST', {
        email,
        password,
        data: { ...metadata, musrenbang_test_run_id: runId },
      }),
    record: (entry, result) => {
      const id = result.data.id ?? result.data.user?.id;
      if (result.status === 200 && id) entry.id = id;
    },
  });
  const id = signupResponse.data.id ?? signupResponse.data.user?.id;
  check(`Auth signup ${label}`, signupResponse.status === 200 && Boolean(id));
  check(
    `Signup ${label} belum menerbitkan sesi sebelum konfirmasi`,
    !signupResponse.data.access_token,
  );
  const before = await request('/auth/v1/token?grant_type=password', null, 'POST', {
    email,
    password,
  });
  check(`Login ${label} sebelum konfirmasi ditolak`, before.status === 400);

  const message = await poll(async () => {
    const response = await fetch(`${mailUrl}/api/v1/messages`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = (await response.json()) as {
      messages: { ID: string; To: { Address: string }[] }[];
    };
    return data.messages.find((item) => item.To.some((to) => to.Address === email));
  });
  fixtures.messages.push(message.ID);
  const mail = (await (await fetch(`${mailUrl}/api/v1/message/${message.ID}`)).json()) as {
    HTML: string;
  };
  const links = [...mail.HTML.matchAll(/href="([^"]+)"/g)].map((match) =>
    match[1].replaceAll('&amp;', '&'),
  );
  const confirmation = links.find((link) => link.startsWith(`${apiUrl}/auth/v1/verify?`));
  check(`Email konfirmasi ${label} diterima Mailpit`, Boolean(confirmation));
  const verified = await fetch(confirmation!, {
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  });
  check(
    `Konfirmasi email ${label}`,
    verified.status === 303 && !verified.headers.get('location')?.includes('error='),
  );
  const login = await request<Session>('/auth/v1/token?grant_type=password', null, 'POST', {
    email,
    password,
  });
  check(
    `Auth login ${label}`,
    login.status === 200 && login.data.user.id === id && Boolean(login.data.access_token),
  );
  const actor = {
    id: id!,
    email,
    token: login.data.access_token,
    refresh: login.data.refresh_token,
  };
  const user = await request<{ id: string }>('/auth/v1/user', actor);
  check(`JWT ${label} dikenali Auth`, user.status === 200 && user.data.id === id);
  return actor;
}

export async function cleanup() {
  await cleanupManifest(fixtureManifest, {
    executeRemoteWrites: true,
    confirmFixtureCleanup: true,
    api: async <T>(path: string, method = 'GET') => {
      const result = await adminRequest<T>(path, method);
      return { status: result.status, data: result.data };
    },
    persist: persistFixtureManifest,
  });
  const finalSnapshot = await snapshotApplicationTables(db);
  const matches = Object.keys(fixtureManifest.baseline ?? {}).every(
    (table) =>
      fixtureManifest.baseline?.[table]?.count === finalSnapshot[table]?.count &&
      fixtureManifest.baseline?.[table]?.fingerprint === finalSnapshot[table]?.fingerprint,
  );
  check('Baseline count/fingerprint pulih setelah cleanup lokal', matches);
  fixtureManifest.finalSnapshot = finalSnapshot;
  await persistFixtureManifest();
  if (fixtures.messages.length) {
    const response = await fetch(`${mailUrl}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: fixtures.messages }),
      signal: AbortSignal.timeout(5000),
    });
    check('Email fixture dihapus dari Mailpit', response.ok);
  }
  const leftovers =
    await db`SELECT count(*)::int AS total FROM auth.users WHERE email LIKE ${`integration-${runId}-%`}`;
  check('Cleanup akun fixture terverifikasi', leftovers[0].total === 0);
}

export async function saveReport(failure?: unknown) {
  if (failure && !results.some((result) => !result.passed)) {
    results.push({ name: 'Error runner atau layanan lokal', passed: false });
  }
  const summary = {
    runId,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    results,
    // Jangan serialisasi error/payload: respons Auth dapat memuat kredensial.
    failureType: failure instanceof Error ? failure.name : failure ? 'UnknownError' : null,
    failureCode: (failure as { code?: string } | undefined)?.code ?? null,
    failureSqlState: (failure as { errno?: string } | undefined)?.errno ?? null,
    failureLocation:
      failure instanceof Error
        ? (failure.stack
            ?.split('\n')
            .find((line) => /^\s+at .*scripts[\\/]integration[\\/]/.test(line))
            ?.trim() ?? null)
        : null,
  };
  const directory = join(import.meta.dir, '../../.tmp/integration-results');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${runId}.json`), JSON.stringify(summary, null, 2));
  console.log(`RESULT ${summary.passed} lulus, ${summary.failed} gagal; run ${runId}`);
  if (failure)
    console.log(
      `DIAGNOSTIC ${summary.failureType} ${summary.failureCode ?? ''} ${summary.failureLocation ?? ''}`,
    );
}
