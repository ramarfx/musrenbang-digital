import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { cleanupManifest } from './cleanup';
import { apiHeaders } from './http';
import { createManifestExclusively, writeManifestAtomically } from './manifest';
import { runTrackedWrite } from './tracking';
import {
  ALLOWED_PROJECT_REF,
  ALLOWED_PROJECT_URL,
  DEPLOYED_REMOTE_MIGRATIONS,
  WRITE_TEST_MIGRATIONS,
  assertExpectedMigrationHistory,
  assertRecoveryManifest,
  assertRemoteTarget,
  classifyRemoteMigrationHistory,
  extractJwtProjectRef,
  sanitizeDiagnostic,
  shouldEnforceExpectedMigrationHistory,
  validateRunId,
  type FixtureManifest,
} from './safety';

const runId = '24d101d6-5862-4a85-9c6e-cdad9a46efaa';
const userId = 'f4f0dd90-1e8c-4a55-a215-f2e7cf32a840';
const proposalOwnerId = 'cfa33440-3538-4fd3-bfaa-e4e275737b7a';

function manifestFixture(): FixtureManifest {
  return {
    version: 1,
    environment: 'remote-development',
    projectRef: ALLOWED_PROJECT_REF,
    runId,
    createdAt: '2026-10-27T00:00:00.000Z',
    status: 'running',
    users: [{ label: 'warga-a', email: `test+${runId}@example.invalid` }],
    proposals: [
      { label: 'proposal', title: `Fixture proposal ${runId}`, ownerId: proposalOwnerId },
    ],
    cleanup: { proposals: false, users: false },
  };
}

describe('remote runner safety gates', () => {
  test('membedakan enam migration remote dari target delapan migration', () => {
    expect(DEPLOYED_REMOTE_MIGRATIONS).toHaveLength(6);
    expect(WRITE_TEST_MIGRATIONS).toHaveLength(8);
    expect(classifyRemoteMigrationHistory(WRITE_TEST_MIGRATIONS.slice(0, 7))).toBe('unexpected');
    expect(() => assertExpectedMigrationHistory(WRITE_TEST_MIGRATIONS.slice(0, 7))).toThrow();
    expect(classifyRemoteMigrationHistory(DEPLOYED_REMOTE_MIGRATIONS)).toBe('deployed-baseline');
    expect(classifyRemoteMigrationHistory(WRITE_TEST_MIGRATIONS)).toBe('mvp-migration-present');
    expect(() => assertExpectedMigrationHistory(WRITE_TEST_MIGRATIONS)).not.toThrow();
    expect(() => assertExpectedMigrationHistory(DEPLOYED_REMOTE_MIGRATIONS)).toThrow();
    expect(() =>
      assertExpectedMigrationHistory([...WRITE_TEST_MIGRATIONS, '20990101000000']),
    ).toThrow();
    expect(classifyRemoteMigrationHistory([...DEPLOYED_REMOTE_MIGRATIONS, '20990101000000'])).toBe(
      'unexpected',
    );
    expect(shouldEnforceExpectedMigrationHistory(false, false)).toBe(false);
    expect(shouldEnforceExpectedMigrationHistory(true, false)).toBe(true);
    expect(shouldEnforceExpectedMigrationHistory(true, true)).toBe(false);
  });

  test('recovery hanya menerima manifest milik project dan Run ID yang diminta', () => {
    const manifest = manifestFixture();
    expect(() => assertRecoveryManifest(manifest, runId)).not.toThrow();
    expect(() =>
      assertRecoveryManifest(manifest, '34d101d6-5862-4a85-9c6e-cdad9a46efaa'),
    ).toThrow();
    expect(() =>
      assertRecoveryManifest({ ...manifest, projectRef: 'other-project' }, runId),
    ).toThrow();
    expect(() =>
      assertRecoveryManifest({ ...manifest, environment: 'local-integration' }, runId),
    ).toThrow();
    expect(() => assertRecoveryManifest({ ...manifest, users: null }, runId)).toThrow();
  });

  test('manifest Run ID yang sudah ada ditolak tanpa menimpa catatan cleanup', async () => {
    const tempRoot = join(process.cwd(), '.tmp', 'manifest-regression-tests');
    await mkdir(tempRoot, { recursive: true });
    const tempDir = await mkdtemp(join(tempRoot, 'run-'));
    const path = join(tempDir, `${runId}.json`);
    try {
      await createManifestExclusively(path, manifestFixture());
      await expect(
        createManifestExclusively(path, { ...manifestFixture(), status: 'cleaned' }),
      ).rejects.toMatchObject({ code: 'EEXIST' });
      expect(JSON.parse(await readFile(path, 'utf8')).status).toBe('running');
      await writeManifestAtomically(path, { ...manifestFixture(), status: 'cleanup-required' });
      expect(JSON.parse(await readFile(path, 'utf8')).status).toBe('cleanup-required');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('accepts only the exact allowlisted project URL and ref', () => {
    expect(() =>
      assertRemoteTarget({
        projectRef: ALLOWED_PROJECT_REF,
        supabaseUrl: ALLOWED_PROJECT_URL,
        executeRemoteWrites: false,
        confirmFixtureCleanup: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertRemoteTarget({
        projectRef: 'other-project',
        supabaseUrl: ALLOWED_PROJECT_URL,
        executeRemoteWrites: false,
        confirmFixtureCleanup: false,
      }),
    ).toThrow();
    expect(() =>
      assertRemoteTarget({
        projectRef: ALLOWED_PROJECT_REF,
        supabaseUrl: 'https://other-project.supabase.co',
        executeRemoteWrites: false,
        confirmFixtureCleanup: false,
      }),
    ).toThrow();
    for (const url of [
      `https://attacker@${ALLOWED_PROJECT_REF}.supabase.co`,
      `https://${ALLOWED_PROJECT_REF}.supabase.co:8443`,
    ]) {
      expect(() =>
        assertRemoteTarget({
          projectRef: ALLOWED_PROJECT_REF,
          supabaseUrl: url,
          executeRemoteWrites: false,
          confirmFixtureCleanup: false,
        }),
      ).toThrow();
    }
  });

  test('requires both write gates and the exact database host', () => {
    expect(() =>
      assertRemoteTarget({
        projectRef: ALLOWED_PROJECT_REF,
        supabaseUrl: ALLOWED_PROJECT_URL,
        executeRemoteWrites: true,
        confirmFixtureCleanup: false,
      }),
    ).toThrow();
    expect(() =>
      assertRemoteTarget({
        projectRef: ALLOWED_PROJECT_REF,
        supabaseUrl: ALLOWED_PROJECT_URL,
        databaseHost: 'db.other-project.supabase.co',
        executeRemoteWrites: true,
        confirmFixtureCleanup: true,
      }),
    ).toThrow();
  });

  test('checks JWT project reference without exposing token text', () => {
    const payload = Buffer.from(JSON.stringify({ ref: ALLOWED_PROJECT_REF })).toString('base64url');
    expect(extractJwtProjectRef(`eyJhbGciOiJub25lIn0.${payload}.sig`)).toBe(ALLOWED_PROJECT_REF);
    expect(extractJwtProjectRef('sb_secret_nonjwt')).toBeUndefined();
    expect(sanitizeDiagnostic(new Error('secret-token-should-not-appear'))).toEqual({
      type: 'Error',
      code: null,
    });
    expect(validateRunId(runId)).toBe(runId);
    expect(() => validateRunId('latest')).toThrow();
  });

  test('uses opaque API keys only in apikey and Auth JWT only as bearer', () => {
    const publishable = apiHeaders('sb_publishable_fixture');
    expect(publishable.get('apikey')).toBe('sb_publishable_fixture');
    expect(publishable.has('Authorization')).toBe(false);
    const secret = apiHeaders('sb_secret_fixture', 'sb_secret_fixture');
    expect(secret.get('apikey')).toBe('sb_secret_fixture');
    expect(secret.has('Authorization')).toBe(false);
    const user = apiHeaders('sb_publishable_fixture', 'eyJ.user-token.fixture');
    expect(user.get('Authorization')).toBe('Bearer eyJ.user-token.fixture');
    const legacy = apiHeaders('eyJ.legacy-anon.fixture');
    expect(legacy.get('Authorization')).toBe('Bearer eyJ.legacy-anon.fixture');
  });
});

describe('remote fixture cleanup simulation through mocked HTTP', () => {
  test('recovers uncertain IDs, deletes only exact fixtures, verifies and can be rerun', async () => {
    const manifest = manifestFixture();
    const deleted: string[] = [];
    const persisted: string[] = [];
    const mockApi = async <T>(
      path: string,
      method = 'GET',
    ): Promise<{ status: number; data: T }> => {
      if (path.startsWith('/rest/v1/proposals?judul=eq.')) {
        return {
          status: 200,
          data: [
            {
              id: 481,
              judul: manifest.proposals[0].title,
              deskripsi: `Fixture ${runId}`,
              pengusul_id: proposalOwnerId,
            },
          ] as T,
        };
      }
      if (path.startsWith('/rest/v1/proposals?id=eq.481&select=')) {
        return {
          status: 200,
          data: deleted.includes('proposal:481')
            ? ([] as T)
            : ([
                {
                  id: 481,
                  judul: manifest.proposals[0].title,
                  deskripsi: `Fixture ${runId}`,
                  pengusul_id: proposalOwnerId,
                },
              ] as T),
        };
      }
      if (path === '/rest/v1/proposals?id=eq.481' && method === 'DELETE') {
        deleted.push('proposal:481');
        return { status: 204, data: null as T };
      }
      if (path.startsWith('/auth/v1/admin/users?page=')) {
        return {
          status: 200,
          data: {
            users: [
              {
                id: userId,
                email: manifest.users[0].email,
                created_at: manifest.createdAt,
                user_metadata: { musrenbang_test_run_id: runId },
              },
            ],
          } as T,
        };
      }
      if (path.endsWith(`/${userId}`) && method === 'DELETE') {
        deleted.push(`user:${userId}`);
        return { status: 204, data: null as T };
      }
      if (path.endsWith(`/${userId}`) && deleted.includes(`user:${userId}`)) {
        return { status: 404, data: null as T };
      }
      if (path.endsWith(`/${userId}`)) {
        return {
          status: 200,
          data: {
            user: {
              id: userId,
              email: manifest.users[0].email,
              created_at: manifest.createdAt,
              user_metadata: { musrenbang_test_run_id: runId },
            },
          } as T,
        };
      }
      if (path.includes('id=in.(481)')) return { status: 200, data: [] as T };
      throw new Error(`Unexpected mock request ${method} ${path}`);
    };
    const options = {
      executeRemoteWrites: true,
      confirmFixtureCleanup: true,
      api: mockApi,
      persist: async () => {
        persisted.push(manifest.status);
      },
    };
    await cleanupManifest(manifest, options);
    expect(manifest.status).toBe('cleaned');
    expect(deleted).toHaveLength(2);
    await cleanupManifest(manifest, options);
    expect(deleted).toHaveLength(2);
    expect(persisted.length).toBeGreaterThan(3);
  });

  test('refuses cleanup without both explicit gates', async () => {
    const manifest = manifestFixture();
    let called = false;
    await expect(
      cleanupManifest(manifest, {
        executeRemoteWrites: true,
        confirmFixtureCleanup: false,
        api: async <T>() => {
          called = true;
          return { status: 200, data: [] as T };
        },
        persist: async () => undefined,
      }),
    ).rejects.toThrow('konfirmasi');
    expect(called).toBe(false);
  });

  test('retains manifest as cleanup-required if a fixture delete fails', async () => {
    const manifest = manifestFixture();
    manifest.proposals[0].id = 481;
    let deleted = false;
    let saved = false;
    await expect(
      cleanupManifest(manifest, {
        executeRemoteWrites: true,
        confirmFixtureCleanup: true,
        api: async <T>(path: string, method = 'GET') => {
          if (path.startsWith('/rest/v1/proposals?id=eq.481&select=')) {
            return {
              status: 200,
              data: (deleted
                ? []
                : [
                    {
                      id: 481,
                      judul: manifest.proposals[0].title,
                      deskripsi: runId,
                      pengusul_id: proposalOwnerId,
                    },
                  ]) as T,
            };
          }
          if (method === 'DELETE') {
            deleted = true;
            return { status: 500, data: null as T };
          }
          return { status: 200, data: [] as T };
        },
        persist: async () => {
          saved = true;
        },
      }),
    ).rejects.toThrow('Cleanup proposal fixture gagal');
    expect(saved).toBe(true);
    expect(manifest.status).toBe('cleanup-required');
  });

  test('never deletes an existing account without the exact run marker', async () => {
    const manifest = manifestFixture();
    manifest.proposals = [];
    let deleteCalled = false;
    await expect(
      cleanupManifest(manifest, {
        executeRemoteWrites: true,
        confirmFixtureCleanup: true,
        api: async <T>(path: string) => {
          if (path.startsWith('/auth/v1/admin/users?page=')) {
            return {
              status: 200,
              data: {
                users: [
                  {
                    id: userId,
                    email: manifest.users[0].email,
                    created_at: manifest.createdAt,
                    user_metadata: { nama: 'existing' },
                  },
                ],
              } as T,
            };
          }
          deleteCalled = true;
          return { status: 204, data: null as T };
        },
        persist: async () => undefined,
      }),
    ).rejects.toThrow('Run ID');
    expect(deleteCalled).toBe(false);
    expect(manifest.status).toBe('cleanup-required');
  });

  test('does not issue create request if the pre-write manifest cannot be persisted', async () => {
    const entry: { email: string; id?: string } = { email: `test+${runId}@example.invalid` };
    let createCalled = false;
    await expect(
      runTrackedWrite({
        entry,
        persist: async () => {
          throw new Error('simulated manifest write failure');
        },
        create: async () => {
          createCalled = true;
          return { id: userId };
        },
        record: () => undefined,
      }),
    ).rejects.toThrow('simulated manifest write failure');
    expect(createCalled).toBe(false);
  });

  test('keeps planned identity recoverable if create succeeds but ID persistence fails', async () => {
    const entry: { email: string; id?: string } = { email: `test+${runId}@example.invalid` };
    let writes = 0;
    let createCalled = false;
    await expect(
      runTrackedWrite({
        entry,
        persist: async () => {
          writes++;
          if (writes === 2) throw new Error('simulated post-create manifest failure');
        },
        create: async () => {
          createCalled = true;
          return { id: userId };
        },
        record: (target, result) => {
          Object.assign(target, result);
        },
      }),
    ).rejects.toThrow('simulated post-create manifest failure');
    expect(createCalled).toBe(true);
    expect(entry).toEqual({ email: `test+${runId}@example.invalid`, id: userId });
    expect(writes).toBe(2);
  });

  test('does not retry deletion after uncertain delete response and can verify absence', async () => {
    const manifest = manifestFixture();
    manifest.proposals = [];
    manifest.users[0].id = userId;
    let deleteCount = 0;
    let deleted = false;
    const api = async <T>(path: string, method = 'GET') => {
      if (path.endsWith(`/${userId}`) && method === 'DELETE') {
        deleteCount++;
        deleted = true;
        return { status: 500, data: null as T };
      }
      if (path.endsWith(`/${userId}`) && deleted) return { status: 404, data: null as T };
      if (path.endsWith(`/${userId}`)) {
        return {
          status: 200,
          data: {
            user: {
              id: userId,
              email: manifest.users[0].email,
              created_at: manifest.createdAt,
              user_metadata: { musrenbang_test_run_id: runId },
            },
          } as T,
        };
      }
      return { status: 200, data: [] as T };
    };
    await expect(
      cleanupManifest(manifest, {
        executeRemoteWrites: true,
        confirmFixtureCleanup: true,
        api,
        persist: async () => undefined,
      }),
    ).rejects.toThrow('Cleanup user fixture gagal');
    expect(deleteCount).toBe(1);
    await cleanupManifest(manifest, {
      executeRemoteWrites: true,
      confirmFixtureCleanup: true,
      api,
      persist: async () => undefined,
    });
    expect(deleteCount).toBe(1);
    expect(manifest.status).toBe('cleaned');
  });

  test('cleans safely when Auth create fails before creating a user', async () => {
    const manifest = manifestFixture();
    manifest.proposals = [];
    let createError = false;
    await expect(
      runTrackedWrite({
        entry: manifest.users[0],
        persist: async () => undefined,
        create: async () => {
          createError = true;
          throw new TypeError('simulated API connection failure');
        },
        record: (entry, result: { id: string }) => {
          entry.id = result.id;
        },
      }),
    ).rejects.toThrow('simulated API connection failure');
    expect(createError).toBe(true);
    let deleteCalled = false;
    await cleanupManifest(manifest, {
      executeRemoteWrites: true,
      confirmFixtureCleanup: true,
      api: async <T>(path: string, method = 'GET') => {
        if (path.startsWith('/auth/v1/admin/users?page=')) {
          return { status: 200, data: { users: [] } as T };
        }
        if (method === 'DELETE') deleteCalled = true;
        return { status: 404, data: null as T };
      },
      persist: async () => undefined,
    });
    expect(deleteCalled).toBe(false);
    expect(manifest.users[0].deleted).toBe(true);
    expect(manifest.status).toBe('cleaned');
  });
});
