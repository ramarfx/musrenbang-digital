import { SQL } from 'bun';
const target = process.env.MUSRENAI_QUOTA_TEST_DATABASE_URL ?? '';
const url = new URL(target);
if (
  !['postgres:', 'postgresql:'].includes(url.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
  url.port !== '54322' ||
  !/^\/musrenai_quota_test_[a-f0-9]{16}$/.test(url.pathname) ||
  url.search ||
  url.hash
)
  throw new Error('Database fixture lokal tidak valid');
const connections = Array.from({ length: 2 }, () => new SQL(target));
try {
  const batches = await Promise.all(
    connections.map(async (sql, index) => {
      const outcomes: boolean[] = [];
      const feature = index ? 'admin' : 'warga';
      for (let i = 0; i < 10; i++) {
        const rows =
          await sql`SELECT public.reserve_musrenai_provider_attempt(${feature}) AS allowed`;
        outcomes.push(rows[0]?.allowed === true);
      }
      return outcomes;
    }),
  );
  const rows =
    await connections[0]!`SELECT count(*)::integer AS total FROM private.musrenai_provider_attempts`;
  const allowed = batches.flat().filter(Boolean).length;
  if (allowed !== 10 || rows[0]?.total !== 10)
    throw new Error(`Limit concurrency gagal: allowed=${allowed}, recorded=${rows[0]?.total}`);
  console.log('QUOTA_CONCURRENCY_OK: two concurrent connections, 20 attempts, 10 allowed');
} finally {
  await Promise.all(connections.map((sql) => sql.close()));
}
