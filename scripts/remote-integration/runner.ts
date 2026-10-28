import { SQL } from 'bun';
import { mkdir, readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { join } from 'node:path';
import { cleanupManifest } from './cleanup';
import { apiHeaders } from './http';
import { applicationTableOrder, snapshotApplicationTables } from './snapshot';
import { runTrackedWrite } from './tracking';
import { createManifestExclusively, writeManifestAtomically } from './manifest';
import {
  ALLOWED_PROJECT_REF,
  assertRecoveryManifest,
  assertExpectedMigrationHistory,
  assertRemoteTarget,
  classifyRemoteMigrationHistory,
  extractJwtProjectRef,
  sanitizeDiagnostic,
  shouldEnforceExpectedMigrationHistory,
  validateRunId,
  WRITE_TEST_MIGRATIONS,
  type FixtureManifest,
} from './safety';

const runIdArg = process.argv.find((arg) => arg.startsWith('--run-id='))?.slice(9);
const recovering = process.argv.includes('--recover-cleanup');
const execute = process.argv.includes('--execute');
const cleanupConfirmed = process.argv.includes('--confirm-cleanup');
const emailPrerequisitesConfirmed = process.argv.includes('--confirm-email-prerequisites');
const runId = validateRunId(runIdArg ?? '');
const apiUrl = process.env.REMOTE_SUPABASE_URL ?? '';
const anonKey = process.env.REMOTE_SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.REMOTE_SUPABASE_SERVICE_KEY ?? '';
const databaseUrl = process.env.REMOTE_DATABASE_URL ?? '';
const runDir = join(import.meta.dir, '../../.tmp/remote-integration');
const manifestPath = join(runDir, `${runId}.json`);

type Actor = { id: string; email: string; password: string; access: string; refresh: string };
const results: { name: string; passed: boolean }[] = [];
let manifest: FixtureManifest;
let db: InstanceType<typeof SQL> | undefined;
let preflightBaseline: Record<string, { count: number; fingerprint: string }> | undefined;

function check(name: string, passed: boolean) {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) throw new Error(`Assertion failed: ${name}`);
}

async function persist() {
  await mkdir(runDir, { recursive: true });
  await writeManifestAtomically(manifestPath, manifest);
}

async function api<T>(path: string, token?: string, method = 'GET', body?: unknown, admin = false) {
  const key = admin ? serviceKey : anonKey;
  const headers = apiHeaders(key, token);
  let response: Response;
  try {
    const request: RequestInit = {
      method,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    };
    if (body !== undefined) request.body = JSON.stringify(body);
    response = await fetch(`${apiUrl}${path}`, request);
  } catch (error) {
    const diagnostic = sanitizeDiagnostic(error);
    throw new Error(
      `HTTP ${path.split('?')[0]} gagal: ${diagnostic.type}/${diagnostic.code ?? 'no-code'}`,
    );
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: response.status, data: data as T, headers: response.headers };
}

function assertDatabaseTarget(urlText: string) {
  const url = new URL(urlText);
  assertRemoteTarget({
    projectRef: ALLOWED_PROJECT_REF,
    supabaseUrl: apiUrl,
    serviceKeyRef: extractJwtProjectRef(serviceKey),
    databaseHost: url.hostname,
    executeRemoteWrites: execute,
    confirmFixtureCleanup: cleanupConfirmed,
  });
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('REMOTE_DATABASE_URL harus memakai PostgreSQL TLS endpoint yang diverifikasi.');
  }
  if (url.searchParams.get('sslmode') !== 'require') {
    throw new Error('REMOTE_DATABASE_URL wajib memakai sslmode=require.');
  }
}

async function verifyPublicKey(requireSignupReadiness: boolean) {
  const settings = await api<Record<string, unknown>>('/auth/v1/settings');
  check('API key valid pada Auth project yang di-allowlist', settings.status === 200);
  if (settings.status !== 200)
    throw new Error('Auth settings tidak dapat dibaca; target/key gagal preflight.');
  if (requireSignupReadiness) {
    check(
      'Email provider aktif',
      Boolean((settings.data as { external?: { email?: boolean } }).external?.email),
    );
    check(
      'Konfirmasi email aktif',
      Boolean((settings.data as { mailer_autoconfirm?: boolean }).mailer_autoconfirm === false),
    );
    const signupDisabled = (settings.data as { disable_signup?: boolean }).disable_signup;
    if (typeof signupDisabled === 'boolean')
      check('Signup diaktifkan untuk development', !signupDisabled);
    else console.log('MANUAL status signup tidak ditampilkan oleh Auth settings endpoint.');
  }
  if (execute) {
    const keyCheck = await api(
      '/rest/v1/profiles?select=id&limit=0',
      serviceKey,
      'GET',
      undefined,
      true,
    );
    check('Service key valid pada Data API target dengan query tanpa row', keyCheck.status === 200);
    if (keyCheck.status !== 200)
      throw new Error('Service key gagal verifikasi read-only; tulis dibatalkan sebelum fixture.');
  }
}

async function checkManagementConfig() {
  const token = process.env.REMOTE_MANAGEMENT_TOKEN;
  if (!token) {
    console.log(
      'MANUAL smtp/site-url/redirect allowlist/rate limits: Management API token tidak disediakan.',
    );
    return;
  }
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ALLOWED_PROJECT_REF}/config/auth`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok)
    throw new Error(`Management API config read-only gagal: HTTP ${response.status}.`);
  const config = (await response.json()) as Record<string, unknown>;
  const safe = {
    siteUrl: config.site_url,
    additionalRedirectUrls: config.additional_redirect_urls,
    emailConfirmations: config.email_enable_confirmations,
    autoConfirm: config.mailer_autoconfirm,
    smtpConfigured: Boolean(config.smtp_host && config.smtp_admin_email),
    emailRateLimit: config.rate_limit_email_sent ?? null,
    verifyRateLimit: config.rate_limit_verify ?? null,
    refreshRateLimit: config.rate_limit_token_refresh ?? null,
  };
  console.log(`AUTH_CONFIG ${JSON.stringify(safe)}`);
  if (!safe.smtpConfigured)
    console.log('PRASYARAT: verifikasi SMTP/email sender dan kuota sebelum signup fixture.');
  if (!safe.siteUrl) console.log('PRASYARAT MANUAL: SITE_URL tidak terlihat di konfigurasi Auth.');
  if (
    safe.emailRateLimit === null ||
    safe.verifyRateLimit === null ||
    safe.refreshRateLimit === null
  ) {
    console.log(
      'PRASYARAT MANUAL: rate limit tertentu tidak tersedia pada respons Management API.',
    );
  }
}

async function snapshot() {
  if (!db) throw new Error('Koneksi read-only untuk fingerprint belum tersedia.');
  return snapshotApplicationTables(db);
}

async function readOnlyBaseline(options: { requireDatabase: boolean; enforceHistory: boolean }) {
  if (!databaseUrl) {
    if (options.requireDatabase) {
      throw new Error(
        'Mode tulis memerlukan REMOTE_DATABASE_URL untuk verifikasi schema sebelum write.',
      );
    }
    console.log('MANUAL baseline/fingerprint tidak tersedia: REMOTE_DATABASE_URL belum diberikan.');
    return;
  }
  assertDatabaseTarget(databaseUrl);
  db = new SQL(databaseUrl, { max: 1, connectionTimeout: 8 });
  const identity = await db.unsafe(
    `SELECT current_database() AS db, inet_server_addr()::text AS address`,
  );
  check('Koneksi PostgreSQL read-only menuju database Supabase', Boolean(identity[0]?.db));
  const migrationRows = await db.begin('READ ONLY', (transaction) =>
    transaction.unsafe(
      'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version',
    ),
  );
  const versions = migrationRows.map((row: { version: string }) => row.version);
  if (!options.enforceHistory) {
    const classification = classifyRemoteMigrationHistory(versions);
    console.log(
      `MIGRATION_HISTORY_${classification.toUpperCase()} ` +
        `remote=${versions.join(',') || '(kosong)'}; ` +
        `deployedBaseline=${WRITE_TEST_MIGRATIONS.slice(0, 6).join(',')}; ` +
        `writeTest=${WRITE_TEST_MIGRATIONS.join(',')}`,
    );
    preflightBaseline = await snapshot();
    return;
  }
  try {
    assertExpectedMigrationHistory(versions, WRITE_TEST_MIGRATIONS);
    check('History remote cocok dengan delapan migration yang diuji', true);
  } catch (error) {
    check('History remote cocok dengan delapan migration yang diuji', false);
    throw error;
  }
  preflightBaseline = await snapshot();
}

async function preflight() {
  const anonRef = extractJwtProjectRef(anonKey);
  const serviceRef = serviceKey ? extractJwtProjectRef(serviceKey) : undefined;
  if (anonRef && serviceRef && anonRef !== serviceRef) {
    throw new Error('Project ref pada anon dan service credential tidak konsisten.');
  }
  assertRemoteTarget({
    projectRef: ALLOWED_PROJECT_REF,
    supabaseUrl: apiUrl,
    serviceKeyRef: serviceRef ?? anonRef,
    executeRemoteWrites: execute,
    confirmFixtureCleanup: cleanupConfirmed,
  });
  check('Target project ref dan URL tepat', true);
  if (!anonKey) throw new Error('API key publik harus tersedia melalui prompt lokal.');
  if (execute && !serviceKey) throw new Error('Service key hanya diperlukan untuk mode tulis.');
  if (execute && !databaseUrl)
    throw new Error('REMOTE_DATABASE_URL wajib tersedia untuk memeriksa migration sebelum write.');
  await verifyPublicKey(!recovering);
  if (!recovering) await checkManagementConfig();
  await readOnlyBaseline({
    requireDatabase: execute && !recovering,
    enforceHistory: shouldEnforceExpectedMigrationHistory(execute, recovering),
  });
}

function fixtureEmail(value: string, label: 'warga-a' | 'warga-b' | 'admin') {
  const input = value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input)) throw new Error(`Email ${label} tidak valid.`);
  const [local, domain] = input.split('@');
  return `${local}+musrenbang-${runId.slice(0, 8)}-${label}@${domain}`;
}

function randomPassword() {
  return `MiaTest!${crypto.randomUUID()}a9`;
}

async function waitForEmailConfirmation() {
  const rl = createInterface({ input: stdin, output: stdout });
  console.log(
    'Buka email konfirmasi untuk Warga A dan Warga B, klik link, lalu kembali ke terminal. Tidak ada token yang ditampilkan.',
  );
  await rl.question('Tekan Enter setelah kedua email terkonfirmasi. ');
  rl.close();
}

async function signup(label: 'warga-a' | 'warga-b', email: string) {
  const password = randomPassword();
  const fixture = manifest.users.find((user) => user.email === email);
  if (!fixture) throw new Error(`Manifest fixture ${label} tidak disiapkan sebelum signup.`);
  const result = await runTrackedWrite({
    entry: fixture,
    persist,
    create: () =>
      api<Record<string, unknown>>('/auth/v1/signup', undefined, 'POST', {
        email,
        password,
        data: {
          nama: `Fixture ${label}`,
          peran: 'admin',
          role: 'admin',
          musrenbang_test_run_id: runId,
        },
      }),
    record: (entry, response) => {
      const body = response.data as { id?: string; user?: { id?: string } } | null;
      const id = body?.id ?? body?.user?.id;
      if (response.status === 200 && id) entry.id = id;
    },
  });
  const body = result.data as { id?: string; user?: { id?: string }; access_token?: string } | null;
  const id = body?.id ?? body?.user?.id;
  if (result.status !== 200 || !id)
    throw new Error(`Signup ${label} gagal, HTTP ${result.status}.`);
  check(`${label}: signup membuat user tanpa sesi sebelum konfirmasi`, !body?.access_token);
  return { id, email, password };
}

async function login(fixture: { id: string; email: string; password: string }): Promise<Actor> {
  const response = await api<Record<string, unknown>>(
    '/auth/v1/token?grant_type=password',
    undefined,
    'POST',
    {
      email: fixture.email,
      password: fixture.password,
    },
  );
  const body = response.data as {
    access_token?: string;
    refresh_token?: string;
    user?: { id?: string };
  };
  check(
    `Login Auth ${fixture.email.includes('warga-a') ? 'warga A' : 'warga B'}`,
    response.status === 200 && Boolean(body.access_token),
  );
  if (response.status !== 200 || !body.access_token || !body.refresh_token)
    throw new Error('Login setelah konfirmasi gagal.');
  const actor = {
    id: fixture.id,
    email: fixture.email,
    password: fixture.password,
    access: body.access_token,
    refresh: body.refresh_token,
  };
  const authUser = await api<{ id?: string }>('/auth/v1/user', actor.access);
  check(
    'JWT berasal dari Auth dan diterima Auth',
    authUser.status === 200 && authUser.data.id === actor.id,
  );
  const profile = await api<{ id?: string; peran?: string }[]>(
    `/rest/v1/profiles?id=eq.${actor.id}&select=id,peran`,
    actor.access,
  );
  check(
    'Trigger membuat profil warga otomatis',
    profile.status === 200 && profile.data?.[0]?.peran === 'warga',
  );
  return actor;
}

async function createAdmin(email: string): Promise<Actor> {
  const password = randomPassword();
  const fixture = manifest.users.find((user) => user.label === 'admin');
  if (!fixture || fixture.email !== email)
    throw new Error('Manifest admin tidak cocok sebelum Auth Admin createUser.');
  const created = await runTrackedWrite({
    entry: fixture,
    persist,
    create: () =>
      api<{ id?: string; user?: { id?: string } }>(
        '/auth/v1/admin/users',
        serviceKey,
        'POST',
        {
          email,
          password,
          email_confirm: true,
          user_metadata: { nama: 'Fixture Admin', musrenbang_test_run_id: runId },
        },
        true,
      ),
    record: (entry, response) => {
      const id = response.data?.id ?? response.data?.user?.id;
      if (response.status === 200 && id) entry.id = id;
    },
  });
  const id = created.data?.id ?? created.data?.user?.id;
  if (created.status !== 200 || !id)
    throw new Error(`Pembuatan admin fixture melalui Auth Admin gagal, HTTP ${created.status}.`);
  if (!db) throw new Error('Koneksi PostgreSQL untuk provisioning trusted admin tidak tersedia.');
  const changed =
    await db`UPDATE public.profiles SET peran = 'admin' WHERE id = ${id}::uuid AND peran = 'warga' RETURNING id`;
  if (changed.length !== 1)
    throw new Error('Promosi profil admin gagal atau profil bukan warga awal.');
  const session = await api<Record<string, unknown>>(
    '/auth/v1/token?grant_type=password',
    undefined,
    'POST',
    { email, password },
  );
  const body = session.data as {
    access_token?: string;
    refresh_token?: string;
    user?: { id?: string };
  };
  if (session.status !== 200 || !body.access_token || !body.refresh_token)
    throw new Error('Login admin fixture gagal.');
  return { id, email, password, access: body.access_token, refresh: body.refresh_token };
}

async function createProposal(actor: Actor, label: string) {
  const title = `Fixture ${label} ${runId}`;
  const tracked: { label: string; title: string; ownerId: string; id?: number } = {
    label,
    title,
    ownerId: actor.id,
  };
  manifest.proposals.push(tracked);
  const response = await runTrackedWrite({
    entry: tracked,
    persist,
    create: () =>
      api<{ id: number }[]>('/rest/v1/proposals', actor.access, 'POST', {
        judul: title,
        deskripsi: `Usulan pengujian integrasi remote ${runId}; data sementara dan akan dibersihkan.`,
        kategori: 'Pendidikan',
        lokasi: 'Wilayah uji',
        estimasi_biaya: 1000,
      }),
    record: (entry, result) => {
      const id = result.data?.[0]?.id;
      if (result.status === 201 && id) entry.id = id;
    },
  });
  const id = response.data?.[0]?.id;
  if (response.status !== 201 || !id)
    throw new Error(`Pembuatan proposal fixture gagal, HTTP ${response.status}.`);
  return id;
}

async function testApi(a: Actor, b: Actor, admin: Actor) {
  const anonAdminCheck = await api<boolean>('/rest/v1/rpc/is_admin', undefined, 'POST', {});
  const wargaAdminCheck = await api<boolean>('/rest/v1/rpc/is_admin', a.access, 'POST', {});
  const trustedAdminCheck = await api<boolean>('/rest/v1/rpc/is_admin', admin.access, 'POST', {});
  check(
    'RPC is_admin tidak memberi hak admin ke anon/warga dan mengenali admin fixture',
    anonAdminCheck.status === 200 &&
      anonAdminCheck.data === false &&
      wargaAdminCheck.status === 200 &&
      wargaAdminCheck.data === false &&
      trustedAdminCheck.status === 200 &&
      trustedAdminCheck.data === true,
  );
  const hidden = await createProposal(a, 'menunggu');
  const initialHistory = await api<{ id: number; status_baru: string; catatan: string }[]>(
    `/rest/v1/v_proposal_status_history?proposal_id=eq.${hidden}&status_lama=is.null&select=id,status_baru,catatan`,
    a.access,
  );
  check(
    'Trigger mencatat status awal proposal dengan catatan',
    initialHistory.status === 200 &&
      initialHistory.data.length === 1 &&
      initialHistory.data[0].status_baru === 'Diajukan' &&
      initialHistory.data[0].catatan === 'Usulan diajukan.',
  );
  const own = await api<{ id: number }[]>(`/rest/v1/proposals?id=eq.${hidden}&select=id`, a.access);
  const other = await api<{ id: number }[]>(
    `/rest/v1/proposals?id=eq.${hidden}&select=id`,
    b.access,
  );
  const anon = await api<{ id: number }[]>(`/rest/v1/proposals?id=eq.${hidden}&select=id`);
  check('RLS: pemilik membaca proposal Menunggu', own.status === 200 && own.data.length === 1);
  check(
    'RLS: warga B dan anon tidak membaca proposal Menunggu',
    other.status === 200 && !other.data.length && anon.status === 200 && !anon.data.length,
  );
  const adminPending = await api<{ id: number }[]>(
    `/rest/v1/proposals?id=eq.${hidden}&select=id`,
    admin.access,
  );
  check(
    'RLS: admin dapat membaca proposal Menunggu',
    adminPending.status === 200 && adminPending.data.length === 1,
  );
  const hiddenComments = await api<{ id: number }[]>(
    `/rest/v1/comments?proposal_id=eq.${hidden}&select=id`,
  );
  const hiddenCommentView = await api<{ id: number }[]>(
    `/rest/v1/v_comments?proposal_id=eq.${hidden}&select=id`,
  );
  const hiddenHistory = await api<{ id: number }[]>(
    `/rest/v1/proposal_status_history?proposal_id=eq.${hidden}&select=id`,
    b.access,
  );
  check(
    'RLS: komentar dan riwayat usulan Menunggu tidak bocor melalui tabel/view',
    hiddenComments.status === 200 &&
      hiddenComments.data.length === 0 &&
      hiddenCommentView.status === 200 &&
      hiddenCommentView.data.length === 0 &&
      hiddenHistory.status === 200 &&
      hiddenHistory.data.length === 0,
  );
  const privateProfile = await api<{ id: string }[]>(
    `/rest/v1/profiles?id=eq.${a.id}&select=id`,
    b.access,
  );
  check(
    'RLS: warga B tidak membaca profil warga A',
    privateProfile.status === 200 && privateProfile.data.length === 0,
  );
  const illegalPatch = await api(`/rest/v1/proposals?id=eq.${hidden}`, a.access, 'PATCH', {
    status: 'Selesai',
    pengusul_id: b.id,
  });
  const afterPatch = await api<{ status: string; pengusul_id: string }[]>(
    `/rest/v1/proposals?id=eq.${hidden}&select=status,pengusul_id`,
    a.access,
  );
  check(
    'RLS/guard menolak perubahan field status atau pemilik',
    illegalPatch.status >= 400 &&
      afterPatch.data?.[0]?.status === 'Diajukan' &&
      afterPatch.data?.[0]?.pengusul_id === a.id,
  );
  const forbiddenModeration = await api(`/rest/v1/rpc/moderate_proposal`, a.access, 'POST', {
    p_proposal_id: hidden,
    p_moderasi: 'Disetujui',
  });
  check('RPC moderasi menolak warga', forbiddenModeration.status >= 400);
  const approved = await api(`/rest/v1/rpc/moderate_proposal`, admin.access, 'POST', {
    p_proposal_id: hidden,
    p_moderasi: 'Disetujui',
    p_catatan: null,
  });
  check('RPC admin menyetujui proposal', approved.status === 204 || approved.status === 200);
  const publicProposal = await api<{ id: number }[]>(
    `/rest/v1/v_proposals?id=eq.${hidden}&select=id`,
  );
  check(
    'View publik menampilkan hanya setelah moderasi',
    publicProposal.status === 200 && publicProposal.data.length === 1,
  );
  const forbiddenStatus = await api('/rest/v1/rpc/change_proposal_status', a.access, 'POST', {
    p_proposal_id: hidden,
    p_status: 'Selesai',
  });
  check('RPC perubahan status menolak warga', forbiddenStatus.status >= 400);
  const directStatus = await api(`/rest/v1/proposals?id=eq.${hidden}`, admin.access, 'PATCH', {
    status: 'Selesai',
  });
  const statusAfterDirect = await api<{ status: string }[]>(
    `/rest/v1/proposals?id=eq.${hidden}&select=status`,
    admin.access,
  );
  check(
    'Admin tidak dapat melewati RPC status dengan PATCH tabel langsung',
    directStatus.status >= 400 && statusAfterDirect.data?.[0]?.status === 'Diajukan',
  );
  const legacyStatus = await api<{ code?: string }>(
    '/rest/v1/rpc/change_proposal_status',
    admin.access,
    'POST',
    { p_proposal_id: hidden, p_status: 'Diverifikasi' },
  );
  check(
    'RPC lama menolak status tanpa catatan',
    legacyStatus.status === 400 && legacyStatus.data.code === '22023',
  );
  const statusChange = await api(
    '/rest/v1/rpc/change_proposal_status_with_note',
    admin.access,
    'POST',
    {
      p_proposal_id: hidden,
      p_status: 'Diverifikasi',
      p_catatan: 'Diverifikasi oleh admin untuk pengujian.',
    },
  );
  check(
    'RPC admin mengubah status dan menulis riwayat bercatatan',
    statusChange.status === 204 || statusChange.status === 200,
  );
  const publicHistory = await api<{ status_baru: string; catatan: string }[]>(
    `/rest/v1/v_proposal_status_history?proposal_id=eq.${hidden}&status_baru=eq.Diverifikasi&select=status_baru,catatan`,
  );
  check(
    'Riwayat status dan catatan proposal yang disetujui terlihat publik',
    publicHistory.status === 200 &&
      publicHistory.data.length === 1 &&
      publicHistory.data[0].catatan === 'Diverifikasi oleh admin untuk pengujian.',
  );
  const vote = await api('/rest/v1/votes', b.access, 'POST', {
    proposal_id: hidden,
    user_id: b.id,
  });
  check('Warga B dapat voting pada proposal disetujui', vote.status === 201);
  const dupeVote = await api('/rest/v1/votes', b.access, 'POST', {
    proposal_id: hidden,
    user_id: b.id,
  });
  check('Unique constraint menolak voting ganda', dupeVote.status >= 400);
  const voteOwner = await api<{ user_id: string }[]>(
    `/rest/v1/votes?proposal_id=eq.${hidden}&select=user_id`,
    b.access,
  );
  const voteOther = await api<{ user_id: string }[]>(
    `/rest/v1/votes?proposal_id=eq.${hidden}&select=user_id`,
    a.access,
  );
  const voteAdmin = await api<{ user_id: string }[]>(
    `/rest/v1/votes?proposal_id=eq.${hidden}&select=user_id`,
    admin.access,
  );
  check(
    'RLS: hanya pemilik/admin melihat vote individual',
    voteOwner.data?.[0]?.user_id === b.id &&
      voteOther.data.length === 0 &&
      voteAdmin.data.length === 1,
  );
  const comment = await api('/rest/v1/comments', b.access, 'POST', {
    proposal_id: hidden,
    user_id: b.id,
    isi: `Komentar fixture ${runId}`,
  });
  check('Warga B dapat mengomentari proposal disetujui', comment.status === 201);
  const visibleComments = await api<{ id: number }[]>(
    `/rest/v1/v_comments?proposal_id=eq.${hidden}&select=id`,
  );
  check(
    'View komentar menampilkan komentar pada proposal yang disetujui',
    visibleComments.status === 200 && visibleComments.data.length === 1,
  );
  const historyWrite = await api('/rest/v1/proposal_status_history', a.access, 'POST', {
    proposal_id: hidden,
    status_baru: 'Selesai',
  });
  check('Warga tidak dapat memalsukan riwayat status', historyWrite.status >= 400);
  const directAllocation = await api('/rest/v1/allocations', a.access, 'POST', {
    user_id: a.id,
    kategori: 'Pendidikan',
    jumlah: 1,
  });
  check('Penulisan tabel allocations langsung ditolak', directAllocation.status >= 400);
  const valid = await api('/rest/v1/rpc/save_allocations', a.access, 'POST', {
    p_rows: [
      { kategori: 'Pendidikan', jumlah: 6000000 },
      { kategori: 'Kesehatan', jumlah: 4000000 },
    ],
  });
  check('RPC alokasi menerima payload valid', valid.status === 204 || valid.status === 200);
  const over = await api('/rest/v1/rpc/save_allocations', a.access, 'POST', {
    p_rows: [{ kategori: 'Pendidikan', jumlah: 10000001 }],
  });
  check('RPC alokasi menolak anggaran berlebih', over.status >= 400);
  const hiddenAlloc = await api<{ user_id: string }[]>(
    '/rest/v1/allocations?user_id=eq.' + a.id + '&select=user_id',
    b.access,
  );
  check(
    'Warga B tidak melihat alokasi warga A',
    hiddenAlloc.status === 200 && hiddenAlloc.data.length === 0,
  );
  const gap = await api<
    {
      kategori: string;
      total_alokasi_warga: number;
      jumlah_partisipan: number;
      apbd_tersedia: boolean;
    }[]
  >('/rest/v1/v_gap?select=kategori,total_alokasi_warga,jumlah_partisipan,apbd_tersedia');
  check('View v_gap agregat tersedia bagi anon', gap.status === 200 && Array.isArray(gap.data));
  check(
    'v_gap mengembalikan agregat partisipan tanpa identitas',
    gap.status === 200 && gap.data.every((row) => typeof row.jumlah_partisipan === 'number'),
  );
  const publicStats = await api<
    { jumlah_partisipan_alokasi: number; total_alokasi_warga: number }[]
  >(
    '/rest/v1/v_public_stats?select=jumlah_usulan_disetujui,jumlah_pemberi_suara,jumlah_partisipan_alokasi,total_alokasi_warga',
  );
  check(
    'View statistik publik mengembalikan agregat saja',
    publicStats.status === 200 &&
      publicStats.data.length === 1 &&
      typeof publicStats.data[0].jumlah_partisipan_alokasi === 'number',
  );
  const adminStats = await api<{ total_pengguna: number }[]>(
    '/rest/v1/v_admin_stats',
    admin.access,
  );
  const wargaStats = await api<{ total_pengguna: number }[]>('/rest/v1/v_admin_stats', a.access);
  check(
    'Statistik admin hanya tampil bagi admin',
    adminStats.status === 200 &&
      adminStats.data.length === 1 &&
      wargaStats.status === 200 &&
      wargaStats.data.length === 0,
  );
  const first = api('/rest/v1/rpc/save_allocations', a.access, 'POST', {
    p_rows: [
      { kategori: 'Pendidikan', jumlah: 6000000 },
      { kategori: 'Kesehatan', jumlah: 4000000 },
    ],
  });
  const second = api('/rest/v1/rpc/save_allocations', a.access, 'POST', {
    p_rows: [
      { kategori: 'Pendidikan', jumlah: 7000000 },
      { kategori: 'Kesehatan', jumlah: 3000000 },
    ],
  });
  const races = await Promise.all([first, second]);
  check(
    'Dua RPC alokasi HTTP bersamaan selesai tanpa error',
    races.every((item) => item.status === 204 || item.status === 200),
  );
  const finalRows = await api<{ kategori: string; jumlah: number }[]>(
    `/rest/v1/allocations?user_id=eq.${a.id}&select=kategori,jumlah`,
    a.access,
  );
  const total = finalRows.data.reduce((sum, row) => sum + Number(row.jumlah), 0);
  const set = finalRows.data
    .map((row) => `${row.kategori}:${row.jumlah}`)
    .sort()
    .join('|');
  check(
    'Concurrency HTTP menghasilkan satu set utuh sesuai salah satu permintaan',
    total === 10000000 &&
      ['Kesehatan:3000000|Pendidikan:7000000', 'Kesehatan:4000000|Pendidikan:6000000'].includes(
        set,
      ),
  );
  const refresh = await api<{ access_token?: string; refresh_token?: string }>(
    '/auth/v1/token?grant_type=refresh_token',
    undefined,
    'POST',
    { refresh_token: a.refresh },
  );
  check(
    'Refresh token diterbitkan Auth dapat dipakai',
    refresh.status === 200 && Boolean(refresh.data.access_token),
  );
  if (refresh.data.access_token) a.access = refresh.data.access_token;
  if (refresh.data.refresh_token) a.refresh = refresh.data.refresh_token;
  const logout = await api('/auth/v1/logout?scope=global', a.access, 'POST');
  check('Logout mencabut refresh session', logout.status === 204);
  const postLogoutRefresh = await api(
    '/auth/v1/token?grant_type=refresh_token',
    undefined,
    'POST',
    { refresh_token: a.refresh },
  );
  check('Refresh token setelah logout ditolak', postLogoutRefresh.status >= 400);
}

async function cleanupFixtures() {
  await cleanupManifest(manifest, {
    executeRemoteWrites: execute,
    confirmFixtureCleanup: cleanupConfirmed,
    api: async <T>(path: string, method = 'GET') => {
      const result = await api<T>(path, serviceKey, method, undefined, true);
      return { status: result.status, data: result.data };
    },
    persist,
  });
  check('Cleanup fixture terverifikasi', manifest.status === 'cleaned');
}

async function recoveryCleanup() {
  const savedManifest: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  assertRecoveryManifest(savedManifest, runId);
  manifest = savedManifest;
  await cleanupFixtures();
}

async function compareBaseline(): Promise<boolean | undefined> {
  if (!db) {
    console.log(
      'BASELINE_UNAVAILABLE: cleanup diverifikasi lewat API; PostgreSQL fingerprint tidak tersedia.',
    );
    return undefined;
  }
  if (!manifest.baseline) {
    console.log('BASELINE_UNAVAILABLE: tidak ada snapshot baseline di manifest run.');
    return undefined;
  }
  manifest.finalSnapshot = await snapshot();
  const mismatches = Object.keys(applicationTableOrder).filter((table) => {
    const before = manifest.baseline?.[table];
    const after = manifest.finalSnapshot?.[table];
    return (
      !before || !after || before.count !== after.count || before.fingerprint !== after.fingerprint
    );
  });
  console.log(
    mismatches.length
      ? `BASELINE_INCONCLUSIVE: tabel berubah dari baseline (${mismatches.join(', ')}); mungkin ada aktivitas tim lain.`
      : 'BASELINE_MATCH: jumlah dan fingerprint seluruh tabel aplikasi kembali sama.',
  );
  await createManifestExclusively(manifestPath, manifest);
  return mismatches.length === 0;
}

async function main() {
  if (!apiUrl || !anonKey) throw new Error('URL dan API key publik harus tersedia.');
  await preflight();
  if (!execute) {
    console.log('PREFLIGHT_ONLY selesai. Tidak ada write operation yang dijalankan.');
    return;
  }
  if (!cleanupConfirmed) throw new Error('Mode tulis tanpa konfirmasi cleanup ditolak.');
  if (!recovering && !emailPrerequisitesConfirmed) {
    throw new Error(
      'Mode signup memerlukan pengakuan prasyarat email, SMTP, redirect, dan rate limit.',
    );
  }
  if (!serviceKey) throw new Error('Service key tidak tersedia.');
  if (recovering) {
    if (databaseUrl) {
      assertDatabaseTarget(databaseUrl);
      if (!db) db = new SQL(databaseUrl, { max: 1, connectionTimeout: 8 });
    }
    await recoveryCleanup();
    const baselineMatches = await compareBaseline();
    if (baselineMatches === false) {
      throw new Error('Fingerprint berubah selama recovery; kemungkinan ada aktivitas luar run.');
    }
    return;
  }
  if (
    !recovering &&
    (!process.env.REMOTE_WARGA_A_EMAIL ||
      !process.env.REMOTE_WARGA_B_EMAIL ||
      !process.env.REMOTE_ADMIN_EMAIL)
  ) {
    throw new Error('Alamat mailbox Warga A, Warga B, dan admin wajib disiapkan untuk mode tulis.');
  }
  if (!databaseUrl)
    throw new Error(
      'Mode test memerlukan koneksi PostgreSQL untuk baseline dan role admin tepercaya.',
    );
  assertDatabaseTarget(databaseUrl);
  if (!db) db = new SQL(databaseUrl, { max: 1, connectionTimeout: 8 });
  const emails = {
    'warga-a': fixtureEmail(process.env.REMOTE_WARGA_A_EMAIL ?? '', 'warga-a'),
    'warga-b': fixtureEmail(process.env.REMOTE_WARGA_B_EMAIL ?? '', 'warga-b'),
    admin: fixtureEmail(process.env.REMOTE_ADMIN_EMAIL ?? '', 'admin'),
  };
  manifest = {
    version: 1,
    environment: 'remote-development',
    projectRef: ALLOWED_PROJECT_REF,
    runId,
    createdAt: new Date().toISOString(),
    status: 'running',
    users: Object.entries(emails).map(([label, email]) => ({
      label: label as 'warga-a' | 'warga-b' | 'admin',
      email,
    })),
    proposals: [],
    cleanup: { proposals: false, users: false },
    baseline: preflightBaseline,
  };
  await persist();
  let failure: unknown;
  try {
    const aFixture = await signup('warga-a', emails['warga-a']);
    const bFixture = await signup('warga-b', emails['warga-b']);
    await waitForEmailConfirmation();
    const a = await login(aFixture);
    const b = await login(bFixture);
    const admin = await createAdmin(emails.admin);
    const escalation = await api('/rest/v1/profiles?id=eq.' + a.id, a.access, 'PATCH', {
      peran: 'admin',
    });
    const profileA = await api<{ peran: string }[]>(
      `/rest/v1/profiles?id=eq.${a.id}&select=peran`,
      a.access,
    );
    check(
      'Metadata pendaftaran tidak menaikkan role dan warga tidak dapat mengubah peran',
      escalation.status >= 400 && profileA.data?.[0]?.peran === 'warga',
    );
    await testApi(a, b, admin);
    const refreshed = await api('/auth/v1/token?grant_type=refresh_token', undefined, 'POST', {
      refresh_token: b.refresh,
    });
    check('Refresh token warga B berhasil', refreshed.status === 200);
    const logout = await api('/auth/v1/logout?scope=global', b.access, 'POST');
    check('Logout warga B berhasil', logout.status === 204);
  } catch (error) {
    failure = error;
  }
  try {
    await cleanupFixtures();
  } catch (error) {
    manifest.status = 'cleanup-required';
    await persist();
    console.error(
      'CLEANUP_REQUIRED: manifest fixture tersedia tanpa secret di .tmp/remote-integration.',
    );
    if (!failure) failure = error;
  }
  if (manifest.cleanup.proposals && manifest.cleanup.users) {
    const baselineMatches = await compareBaseline();
    if (baselineMatches === false) {
      failure ??= new Error('Fingerprint berubah selama run; data luar run tidak disentuh.');
    }
  }
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`RESULT ${passed} lulus, ${failed} gagal. Run ID ${runId}.`);
  if (failure) {
    const diagnostic = sanitizeDiagnostic(failure);
    console.error(`DIAGNOSTIC ${diagnostic.type}/${diagnostic.code ?? 'no-code'}`);
    throw new Error(
      'Remote integration run gagal; lihat manifest dan hasil assertion tanpa rahasia.',
    );
  }
}

main()
  .catch((error) => {
    const diagnostic = sanitizeDiagnostic(error);
    console.error(`REMOTE_RUN_ABORTED ${diagnostic.type}/${diagnostic.code ?? 'no-code'}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db) await db.close();
    // Hapus rahasia dari environment proses sesegera mungkin; tidak pernah ditulis ke manifest/log.
    for (const key of [
      'REMOTE_SUPABASE_ANON_KEY',
      'REMOTE_SUPABASE_SERVICE_KEY',
      'REMOTE_DATABASE_URL',
      'REMOTE_MANAGEMENT_TOKEN',
    ]) {
      process.env[key] = '';
    }
  });
