import type { FixtureManifest } from './safety';

type ApiResult<T> = { status: number; data: T };
type CleanupApi = <T = unknown>(
  path: string,
  method?: string,
  body?: unknown,
) => Promise<ApiResult<T>>;

type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
};

function asAuthUser(value: unknown): AuthUser | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const response = value as { user?: AuthUser } & AuthUser;
  return response.user ?? response;
}

function assertFixtureIdentity(
  user: AuthUser | undefined,
  expected: { id?: string; email: string },
  manifest: FixtureManifest,
) {
  if (
    !user ||
    (expected.id && user.id !== expected.id) ||
    user.email?.toLowerCase() !== expected.email.toLowerCase()
  ) {
    throw new Error(
      'Identitas Auth tidak cocok dengan manifest fixture. Hentikan dan periksa manual.',
    );
  }
  if (user.user_metadata?.musrenbang_test_run_id !== manifest.runId) {
    throw new Error('Auth user tidak memiliki marker Run ID yang cocok. Akun tidak akan dihapus.');
  }
  const createdAt = Date.parse(user.created_at ?? '');
  const runStartedAt = Date.parse(manifest.createdAt);
  if (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(runStartedAt) ||
    createdAt < runStartedAt - 15 * 60_000
  ) {
    throw new Error('Waktu pembuatan Auth user tidak cocok dengan run; cleanup dihentikan.');
  }
}

type ProposalRow = { id: number; judul: string; deskripsi: string; pengusul_id: string | null };

function assertProposalIdentity(
  row: ProposalRow | undefined,
  proposal: FixtureManifest['proposals'][number],
  runId: string,
) {
  if (
    !row ||
    row.id !== proposal.id ||
    ![proposal.title, ...(proposal.allowedTitles ?? [])].includes(row.judul) ||
    !row.deskripsi.includes(runId) ||
    row.pengusul_id !== proposal.ownerId
  ) {
    throw new Error(
      'Proposal tidak cocok dengan ID, judul, Run ID, dan pemilik fixture; cleanup dihentikan.',
    );
  }
}

export async function cleanupManifest(
  manifest: FixtureManifest,
  options: {
    executeRemoteWrites: boolean;
    confirmFixtureCleanup: boolean;
    api: CleanupApi;
    persist: () => Promise<void>;
  },
) {
  if (!options.executeRemoteWrites || !options.confirmFixtureCleanup) {
    throw new Error('Cleanup memerlukan sakelar tulis dan konfirmasi eksplisit.');
  }
  manifest.status = 'cleanup-required';
  await options.persist();
  for (const proposal of manifest.proposals) {
    if (proposal.deleted) continue;
    if (!proposal.id) {
      const found = await options.api<ProposalRow[]>(
        `/rest/v1/proposals?judul=eq.${encodeURIComponent(proposal.title)}&pengusul_id=eq.${proposal.ownerId}&select=id,judul,deskripsi,pengusul_id`,
      );
      if (found.status !== 200 || found.data.length > 1) {
        throw new Error('Recovery proposal tidak menemukan fixture tepat atau hasilnya ambigu.');
      }
      proposal.id = found.data[0]?.id;
      await options.persist();
      if (!proposal.id) {
        proposal.deleted = true;
        await options.persist();
        continue;
      }
      assertProposalIdentity(found.data[0], proposal, manifest.runId);
    }
    const current = await options.api<ProposalRow[]>(
      `/rest/v1/proposals?id=eq.${proposal.id}&select=id,judul,deskripsi,pengusul_id`,
    );
    if (current.status !== 200 || current.data.length > 1) {
      throw new Error('Proposal ID fixture menghasilkan respons yang ambigu; cleanup dihentikan.');
    }
    if (!current.data.length) {
      proposal.deleted = true;
      await options.persist();
      continue;
    }
    assertProposalIdentity(current.data[0], proposal, manifest.runId);
    const deleted = await options.api(`/rest/v1/proposals?id=eq.${proposal.id}`, 'DELETE');
    if (![200, 204].includes(deleted.status)) {
      throw new Error(`Cleanup proposal fixture gagal, HTTP ${deleted.status}.`);
    }
    proposal.deleted = true;
    await options.persist();
  }
  manifest.cleanup.proposals = true;
  await options.persist();

  for (const user of manifest.users) {
    if (user.deleted) continue;
    if (!user.id) {
      let searchComplete = false;
      let exactEmailFound = false;
      for (let page = 1; page <= 100; page++) {
        const listed = await options.api<{ users?: AuthUser[] }>(
          `/auth/v1/admin/users?page=${page}&per_page=100`,
        );
        if (listed.status !== 200 || !Array.isArray(listed.data.users)) {
          throw new Error('Recovery user tidak dapat mencari fixture secara aman.');
        }
        const matches = listed.data.users.filter(
          (candidate) => candidate.email?.toLowerCase() === user.email.toLowerCase(),
        );
        if (matches.length > 1) {
          throw new Error(
            'Email fixture cocok dengan beberapa Auth user; cleanup perlu penanganan manual.',
          );
        }
        if (matches.length === 1) {
          assertFixtureIdentity(matches[0], user, manifest);
          exactEmailFound = true;
          user.id = matches[0].id;
          await options.persist();
          break;
        }
        if (listed.data.users.length < 100) {
          searchComplete = true;
          break;
        }
      }
      if (!user.id && !searchComplete) {
        throw new Error(
          'Auth lookup mencapai batas paginasi; tidak dapat membuktikan ketiadaan fixture.',
        );
      }
      if (!user.id && !exactEmailFound) {
        user.deleted = true;
        await options.persist();
        continue;
      }
      if (!user.id) {
        throw new Error('Auth user fixture ditemukan tetapi ID tidak dapat dicatat.');
      }
    }
    const current = await options.api<unknown>(`/auth/v1/admin/users/${user.id}`);
    if (current.status === 404) {
      user.deleted = true;
      await options.persist();
      continue;
    }
    if (current.status !== 200)
      throw new Error('Auth user tidak dapat diverifikasi sebelum dihapus.');
    assertFixtureIdentity(asAuthUser(current.data), user, manifest);
    const deleted = await options.api(`/auth/v1/admin/users/${user.id}`, 'DELETE');
    if (![200, 204, 404].includes(deleted.status)) {
      throw new Error(`Cleanup user fixture gagal, HTTP ${deleted.status}.`);
    }
    user.deleted = true;
    await options.persist();
  }
  for (const user of manifest.users) {
    if (!user.id) continue;
    const check = await options.api(`/auth/v1/admin/users/${user.id}`);
    if (check.status !== 404) {
      throw new Error(`Cleanup Auth user ${user.label} belum terverifikasi hilang.`);
    }
  }
  manifest.cleanup.users = true;
  await options.persist();

  const ids = manifest.proposals.flatMap((proposal) =>
    proposal.id === undefined ? [] : [proposal.id],
  );
  const remaining = ids.length
    ? await options.api<{ id: number }[]>(`/rest/v1/proposals?id=in.(${ids.join(',')})&select=id`)
    : { status: 200, data: [] as { id: number }[] };
  if (remaining.status !== 200 || remaining.data.length !== 0) {
    throw new Error('Cleanup belum terverifikasi; fixture proposal masih terbaca.');
  }
  manifest.status = 'cleaned';
  await options.persist();
}
