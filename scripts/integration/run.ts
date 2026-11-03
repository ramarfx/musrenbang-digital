import { testPriorityRankings } from '../remote-integration/priority-scenarios';
import { createClient } from '@supabase/supabase-js';
import { concurrency } from './concurrency';
import type { FixtureManifest } from '../remote-integration/safety';
import { runTrackedWrite } from '../remote-integration/tracking';
import {
  apiUrl,
  beginFixtureRun,
  check,
  cleanup,
  db,
  denied,
  fixtureManifest,
  persistFixtureManifest,
  request,
  rows,
  runId,
  saveReport,
  signup,
  type Actor,
  type Session,
} from './harness';

async function proposal(actor: Actor, label: string) {
  const title = `Integration ${label} ${runId}`;
  const fixture: FixtureManifest['proposals'][number] = { label, title, ownerId: actor.id };
  fixtureManifest.proposals.push(fixture);
  const response = await runTrackedWrite({
    entry: fixture,
    persist: persistFixtureManifest,
    create: () =>
      request<{ id: number; status: string; moderasi: string }[]>(
        '/rest/v1/proposals',
        actor,
        'POST',
        {
          judul: title,
          deskripsi: `Usulan fixture untuk pengujian keamanan integrasi lokal ${runId}.`,
          kategori: 'Pendidikan',
          latitude: -6.2,
          longitude: 106.8,
          estimasi_biaya: 1000000,
          pengusul_id: actor.id,
        },
      ),
    record: (entry, result) => {
      if (result.status === 201 && result.data?.[0]?.id) entry.id = result.data[0].id;
    },
  });
  check(
    `Usulan ${label} tersimpan melalui API`,
    response.status === 201 && response.data.length === 1,
  );
  check(
    `Status awal ${label} dipaksakan database`,
    response.data[0].status === 'Diajukan' && response.data[0].moderasi === 'Menunggu',
  );
  const initialHistory = await rows(
    `v_proposal_status_history?proposal_id=eq.${response.data[0].id}&status_lama=is.null`,
    actor,
  );
  check(
    `Riwayat awal ${label} otomatis memiliki catatan`,
    initialHistory.length === 1 &&
      initialHistory[0].status_baru === 'Diajukan' &&
      initialHistory[0].catatan === 'Usulan diajukan.',
  );
  return response.data[0].id;
}

async function run() {
  const migrations =
    await db`SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`;
  check(
    'Sebelas migration tercatat persisten pada database lokal',
    migrations.map((row: { version: string }) => row.version).join(',') ===
      '20261026090000,20261026090100,20261026090200,20261026090300,20261026195414,20261027004023,20261027065525,20261028135103,20261102122158,20261102141207,20261103031212',
  );
  await beginFixtureRun();
  const allocationBaseline = await db<{ total: number }[]>`
    SELECT COALESCE(sum(jumlah), 0)::bigint AS total FROM public.allocations
  `;
  const baselineAllocationTotal = Number(allocationBaseline[0]?.total ?? 0);
  const settings = await request<{ mailer_autoconfirm: boolean }>('/auth/v1/settings');
  check(
    'Auth lokal mewajibkan konfirmasi email',
    settings.status === 200 && settings.data.mailer_autoconfirm === false,
  );
  const password = `Local!${crypto.randomUUID()}aZ9`;
  const a = await signup('warga-a', password, { nama: 'Warga A', peran: 'admin', role: 'admin' });
  const b = await signup('warga-b', password, {
    nama: '  ',
    full_name: '  Warga B Google  ',
    name: 'Nama Cadangan',
    peran: 'admin',
    role: 'admin',
  });
  const admin = await signup('admin', password, { nama: 'Admin Fixture' });
  for (const actor of [a, b, admin]) {
    const profile = await rows(`profiles?id=eq.${actor.id}`, actor);
    check(
      'Profil otomatis melalui trigger Auth dengan peran warga',
      profile.length === 1 && profile[0].peran === 'warga',
    );
  }
  check(
    'Metadata pendaftaran tidak meningkatkan peran A',
    (await rows(`profiles?id=eq.${a.id}`, a))[0].peran === 'warga',
  );
  const googleMetadataProfile = await rows('profiles?id=eq.' + b.id, b);
  check(
    'Signup Auth dengan metadata berbentuk Google memakai full_name dan tetap warga',
    googleMetadataProfile[0]?.nama === 'Warga B Google' &&
      googleMetadataProfile[0]?.peran === 'warga',
  );
  await db`UPDATE public.profiles SET peran='admin' WHERE id=${admin.id}::uuid`;
  check(
    'Peran admin diberikan melalui SQL pengelola',
    (await rows(`profiles?id=eq.${admin.id}`, admin))[0].peran === 'admin',
  );
  const anonAdminCheck = await request('/rest/v1/rpc/is_admin', null, 'POST', {});
  const wargaAdminCheck = await request('/rest/v1/rpc/is_admin', a, 'POST', {});
  const adminAdminCheck = await request('/rest/v1/rpc/is_admin', admin, 'POST', {});
  check(
    'is_admin RPC tetap aman untuk anon',
    anonAdminCheck.status === 200 && anonAdminCheck.data === false,
  );
  check(
    'is_admin RPC tidak mengangkat warga',
    wargaAdminCheck.status === 200 && wargaAdminCheck.data === false,
  );
  check(
    'is_admin RPC mengenali admin melalui profil',
    adminAdminCheck.status === 200 && adminAdminCheck.data === true,
  );
  check('Warga B tidak membaca profil A', (await rows(`profiles?id=eq.${a.id}`, b)).length === 0);
  await denied('Anon tidak membaca profil', '/rest/v1/profiles', null, 'GET');
  await denied(
    'A tidak meningkatkan peran sendiri',
    `/rest/v1/profiles?id=eq.${a.id}`,
    a,
    'PATCH',
    { peran: 'admin' },
  );
  await denied('A tidak mengubah email profil', `/rest/v1/profiles?id=eq.${a.id}`, a, 'PATCH', {
    email: 'fake@example.test',
  });
  await denied('A tidak membuat profil lewat API', '/rest/v1/profiles', a, 'POST', {
    id: a.id,
    nama: 'Palsu',
    email: a.email,
    peran: 'admin',
  });
  check(
    'A boleh mengubah nama sendiri',
    (await request('/rest/v1/profiles?id=eq.' + a.id, a, 'PATCH', { nama: 'Nama A diperbarui' }))
      .status === 200,
  );
  check(
    'A tidak mengubah nama profil B',
    (await request<unknown[]>('/rest/v1/profiles?id=eq.' + b.id, a, 'PATCH', { nama: 'Palsu' }))
      .data.length === 0,
  );

  const p = await proposal(a, 'menunggu-a');
  const ownB = await proposal(b, 'menunggu-b');
  const rejected = await proposal(a, 'ditolak-a');
  const query = `id=eq.${p}`;
  for (const table of ['proposals', 'v_proposals']) {
    check(
      `Anon tidak melihat Menunggu melalui ${table}`,
      (await rows(`${table}?${query}`, null)).length === 0,
    );
    check(
      `B tidak melihat Menunggu A melalui ${table}`,
      (await rows(`${table}?${query}`, b)).length === 0,
    );
    check(
      `A membaca usulan sendiri melalui ${table}`,
      (await rows(`${table}?${query}`, a)).length === 1,
    );
    check(
      `Admin membaca Menunggu melalui ${table}`,
      (await rows(`${table}?${query}`, admin)).length === 1,
    );
  }
  const edit = await request<{ judul: string }[]>(`/rest/v1/proposals?${query}`, a, 'PATCH', {
    judul: 'Judul hasil edit A saat Menunggu',
  });
  check(
    'A mengedit isi saat Menunggu',
    edit.status === 200 && edit.data[0]?.judul === 'Judul hasil edit A saat Menunggu',
  );
  check(
    'B tidak mengedit usulan A',
    (
      await request<unknown[]>(`/rest/v1/proposals?${query}`, b, 'PATCH', {
        judul: 'Edit tidak berhak oleh warga B',
      })
    ).data.length === 0,
  );
  for (const patch of [
    { status: 'Selesai' },
    { moderasi: 'Disetujui' },
    { pengusul_id: b.id },
    { dimoderasi_oleh: a.id },
  ]) {
    await denied(
      `Field terlindungi ${Object.keys(patch)[0]} ditolak`,
      `/rest/v1/proposals?${query}`,
      a,
      'PATCH',
      patch,
    );
  }
  for (const forged of [{ status: 'Selesai' }, { moderasi: 'Disetujui' }]) {
    await denied(
      `INSERT palsu ${Object.keys(forged)[0]} ditolak`,
      '/rest/v1/proposals',
      a,
      'POST',
      {
        judul: 'Usulan dengan tahap awal palsu',
        deskripsi: 'Deskripsi cukup panjang untuk pengujian integrasi.',
        kategori: 'Pendidikan',
        pengusul_id: a.id,
        estimasi_biaya: 1000,
        ...forged,
      },
    );
  }
  await denied('Anon tidak membuat usulan', '/rest/v1/proposals', null, 'POST', {
    judul: 'Anon tidak berhak',
  });
  await denied('A tidak memoderasi sendiri', '/rest/v1/rpc/moderate_proposal', a, 'POST', {
    p_proposal_id: p,
    p_moderasi: 'Disetujui',
  });
  const legacyCitizenStatus = await request<{ code?: string }>(
    '/rest/v1/rpc/change_proposal_status',
    a,
    'POST',
    { p_proposal_id: p, p_status: 'Selesai' },
  );
  const statusAfterLegacy = await rows(`proposals?id=eq.${p}&select=status`, admin);
  check(
    'RPC status lama menolak warga tanpa mengubah status',
    legacyCitizenStatus.status === 400 &&
      legacyCitizenStatus.data.code === '22023' &&
      statusAfterLegacy[0]?.status === 'Diajukan',
  );
  const noReason = await request<{ code: string }>(
    '/rest/v1/rpc/moderate_proposal',
    admin,
    'POST',
    { p_proposal_id: rejected, p_moderasi: 'Ditolak' },
  );
  check(
    'Penolakan tanpa alasan ditolak RPC',
    noReason.status === 400 && noReason.data.code === '22023',
  );
  check(
    'Admin menolak dengan alasan',
    (
      await request('/rest/v1/rpc/moderate_proposal', admin, 'POST', {
        p_proposal_id: rejected,
        p_moderasi: 'Ditolak',
        p_catatan: 'Duplikat fixture',
      })
    ).status === 204,
  );
  check(
    'A membaca alasan penolakan sendiri',
    (await rows(`v_proposals?id=eq.${rejected}`, a))[0]?.catatan_moderasi === 'Duplikat fixture',
  );
  check(
    'B tidak membaca penolakan A',
    (await rows(`v_proposals?id=eq.${rejected}`, b)).length === 0,
  );

  await denied('Vote pada Menunggu ditolak', '/rest/v1/votes', b, 'POST', {
    user_id: b.id,
    proposal_id: p,
  });
  await denied('Komentar pada Menunggu ditolak', '/rest/v1/comments', a, 'POST', {
    user_id: a.id,
    proposal_id: p,
    isi: 'Belum boleh komentar',
  });
  // Komentar historis disiapkan oleh SQL lokal; riwayat awal sudah dibuat trigger proposal.
  await db`INSERT INTO public.comments(proposal_id,user_id,isi) VALUES(${p},${a.id}::uuid,'Komentar historis tersembunyi')`;
  for (const table of [
    'comments',
    'v_comments',
    'proposal_status_history',
    'v_proposal_status_history',
  ]) {
    check(
      `Anon tidak membaca turunan tersembunyi ${table}`,
      (await rows(`${table}?proposal_id=eq.${p}`, null)).length === 0,
    );
    check(
      `B tidak membaca turunan tersembunyi ${table}`,
      (await rows(`${table}?proposal_id=eq.${p}`, b)).length === 0,
    );
    check(
      `A membaca turunan sendiri ${table}`,
      (await rows(`${table}?proposal_id=eq.${p}`, a)).length === 1,
    );
    check(
      `Admin membaca turunan tersembunyi ${table}`,
      (await rows(`${table}?proposal_id=eq.${p}`, admin)).length === 1,
    );
  }
  check(
    'Admin menyetujui usulan',
    (
      await request('/rest/v1/rpc/moderate_proposal', admin, 'POST', {
        p_proposal_id: p,
        p_moderasi: 'Disetujui',
      })
    ).status === 204,
  );
  check('Usulan disetujui tampil publik', (await rows(`v_proposals?${query}`, null)).length === 1);
  check(
    'View invoker tetap menyediakan nama pengusul yang aman',
    (await rows(`v_proposals?${query}`, null))[0]?.pengusul_nama === 'Nama A diperbarui',
  );
  check(
    'A tidak mengedit usulan disetujui',
    (
      await request<unknown[]>(`/rest/v1/proposals?${query}`, a, 'PATCH', {
        judul: 'Edit ilegal setelah disetujui',
      })
    ).data.length === 0,
  );
  const trackedProposal = fixtureManifest.proposals.find((item) => item.id === p);
  if (!trackedProposal) throw new Error('Proposal fixture tidak tercatat sebelum edit admin.');
  trackedProposal.allowedTitles = ['Judul diperbarui oleh admin'];
  await persistFixtureManifest();
  check(
    'Admin tetap dapat mengedit',
    (
      await request(`/rest/v1/proposals?${query}`, admin, 'PATCH', {
        judul: 'Judul diperbarui oleh admin',
      })
    ).status === 200,
  );
  for (const [label, actor] of [
    ['Anon', null],
    ['Warga A', a],
    ['Warga B', b],
  ] as const) {
    await denied(
      label + ' tidak dapat memanggil RPC status bercatatan',
      '/rest/v1/rpc/change_proposal_status_with_note',
      actor,
      'POST',
      {
        p_proposal_id: p,
        p_status: 'Diverifikasi',
        p_catatan: 'Percobaan tidak berwenang',
      },
    );
  }
  const emptyStatusNote = await request<{ code?: string }>(
    '/rest/v1/rpc/change_proposal_status_with_note',
    admin,
    'POST',
    { p_proposal_id: p, p_status: 'Diverifikasi', p_catatan: '   ' },
  );
  check(
    'RPC status admin menolak catatan kosong melalui HTTP',
    emptyStatusNote.status === 400 && emptyStatusNote.data.code === '22023',
  );
  const beforeValidStatus = await rows('proposals?id=eq.' + p + '&select=status', admin);
  check('Penolakan RPC tidak mengubah status', beforeValidStatus[0]?.status === 'Diajukan');
  check(
    'RPC status admin berhasil dengan catatan wajib',
    (
      await request('/rest/v1/rpc/change_proposal_status_with_note', admin, 'POST', {
        p_proposal_id: p,
        p_status: 'Diverifikasi',
        p_catatan: 'Lokasi dan kebutuhan sudah diverifikasi.',
      })
    ).status === 204,
  );
  const directStatus = await request(`/rest/v1/proposals?${query}`, admin, 'PATCH', {
    status: 'Selesai',
  });
  const afterDirectStatus = await rows(`proposals?id=eq.${p}&select=status`, admin);
  check(
    'Admin tidak dapat melewati RPC status lewat tabel langsung',
    directStatus.status >= 400 && afterDirectStatus[0]?.status === 'Diverifikasi',
  );
  const legacyStatus = await request<{ code?: string }>(
    '/rest/v1/rpc/change_proposal_status',
    admin,
    'POST',
    { p_proposal_id: p, p_status: 'Selesai' },
  );
  check(
    'RPC status lama menolak perubahan tanpa catatan',
    legacyStatus.status === 400 && legacyStatus.data.code === '22023',
  );
  const statusHistory = await rows(
    `v_proposal_status_history?proposal_id=eq.${p}&status_baru=eq.Diverifikasi`,
    null,
  );
  check(
    'Riwayat RPC terlihat publik dengan catatan admin',
    statusHistory.length === 1 &&
      statusHistory[0].catatan === 'Lokasi dan kebutuhan sudah diverifikasi.',
  );
  check(
    'View invoker tetap menyediakan nama aktor riwayat',
    statusHistory[0]?.diubah_oleh_nama === 'Admin Fixture',
  );
  await denied('Riwayat tidak dapat dipalsukan A', '/rest/v1/proposal_status_history', a, 'POST', {
    proposal_id: p,
    status_baru: 'Selesai',
  });
  await denied('Anon tidak memberi suara', '/rest/v1/votes', null, 'POST', {
    proposal_id: p,
    user_id: a.id,
  });
  check(
    'B memberi suara',
    (await request('/rest/v1/votes', b, 'POST', { proposal_id: p, user_id: b.id })).status === 201,
  );
  check('Agregat vote sesuai', (await rows(`v_proposals?${query}`, null))[0]?.jumlah_suara === 1);
  const duplicate = await request<{ code: string }>('/rest/v1/votes', b, 'POST', {
    proposal_id: p,
    user_id: b.id,
  });
  check(
    'Vote ganda ditolak unique constraint',
    duplicate.status === 409 && duplicate.data.code === '23505',
  );
  check(
    'B membatalkan suara',
    (await request(`/rest/v1/votes?proposal_id=eq.${p}&user_id=eq.${b.id}`, b, 'DELETE')).status ===
      200,
  );
  check(
    'Agregat vote kembali nol',
    (await rows(`v_proposals?${query}`, null))[0]?.jumlah_suara === 0,
  );
  await denied('B tidak menyamar sebagai penulis A', '/rest/v1/comments', b, 'POST', {
    proposal_id: p,
    user_id: a.id,
    isi: 'Penulis palsu',
  });
  const comment = await request<{ id: number }[]>('/rest/v1/comments', b, 'POST', {
    proposal_id: p,
    user_id: b.id,
    isi: 'Komentar valid B',
  });
  check('B berkomentar pada usulan disetujui', comment.status === 201);
  const commentId = comment.data[0].id;
  check(
    'View invoker tetap menyediakan nama penulis komentar',
    (await rows(`v_comments?id=eq.${commentId}`, null))[0]?.penulis_nama === 'Warga B Google',
  );
  check(
    'Admin menghapus komentar',
    (await request(`/rest/v1/comments?id=eq.${commentId}`, admin, 'DELETE')).status === 200,
  );
  check(
    'Komentar benar-benar terhapus',
    (await rows(`v_comments?id=eq.${commentId}`, null)).length === 0,
  );
  await request('/rest/v1/rpc/moderate_proposal', admin, 'POST', {
    p_proposal_id: p,
    p_moderasi: 'Ditolak',
    p_catatan: 'Ditutup untuk tes visibilitas',
  });
  for (const table of [
    'proposals',
    'v_proposals',
    'comments',
    'v_comments',
    'proposal_status_history',
    'v_proposal_status_history',
  ]) {
    const filter = table.includes('proposals') ? query : `proposal_id=eq.${p}`;
    check(
      `Setelah ditolak data tidak bocor melalui ${table}`,
      (await rows(`${table}?${filter}`, null)).length === 0,
    );
  }
  check('Usulan B tetap privat', (await rows(`proposals?id=eq.${ownB}`, a)).length === 0);

  await denied('Anon tidak membaca alokasi individual', '/rest/v1/allocations', null, 'GET');
  await denied('Anon tidak menyimpan alokasi', '/rest/v1/rpc/save_allocations', null, 'POST', {
    p_rows: [],
  });
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    await denied(
      `Bypass alokasi langsung ${method} ditolak`,
      '/rest/v1/allocations?user_id=eq.' + a.id,
      a,
      method,
      method === 'DELETE' ? undefined : { user_id: a.id, kategori: 'Pendidikan', jumlah: 99999999 },
    );
  }
  check(
    'RPC alokasi tepat budget berhasil',
    (
      await request('/rest/v1/rpc/save_allocations', a, 'POST', {
        p_rows: [
          { kategori: 'Pendidikan', jumlah: 6000000 },
          { kategori: 'Kesehatan', jumlah: 4000000 },
        ],
      })
    ).status === 204,
  );
  check('Alokasi A tersimpan', (await rows(`allocations?user_id=eq.${a.id}`, a)).length === 2);
  check(
    'B tidak membaca alokasi A',
    (await rows(`allocations?user_id=eq.${a.id}`, b)).length === 0,
  );
  check(
    'B dapat menyimpan alokasi sendiri lewat RPC tervalidasi',
    (
      await request('/rest/v1/rpc/save_allocations', b, 'POST', {
        p_rows: [{ kategori: 'Pendidikan', jumlah: 1000000 }],
      })
    ).status === 204,
  );
  await testPriorityRankings(
    (path, actor, method, body) => request(path, actor as Actor | null, method, body),
    check,
    a,
    b,
    admin,
  );
  const gapAnon = await rows('v_gap', null);
  const gapA = await rows('v_gap', a);
  const gapB = await rows('v_gap', b);
  const gapAdmin = await rows('v_gap', admin);
  const allocationTotal = (data: Record<string, unknown>[]) =>
    data.reduce((sum, row) => sum + Number(row.total_alokasi_warga), 0);
  check(
    `v_gap agregat anon=${allocationTotal(gapAnon)} tetap mencakup dua warga`,
    allocationTotal(gapAnon) === baselineAllocationTotal + 11000000,
  );
  check(
    `v_gap agregat wargaA=${allocationTotal(gapA)} tetap lintas warga`,
    allocationTotal(gapA) === baselineAllocationTotal + 11000000,
  );
  check(
    `v_gap agregat wargaB=${allocationTotal(gapB)} tetap lintas warga`,
    allocationTotal(gapB) === baselineAllocationTotal + 11000000,
  );
  check(
    `v_gap agregat admin=${allocationTotal(gapAdmin)} tetap lengkap`,
    allocationTotal(gapAdmin) === baselineAllocationTotal + 11000000,
  );
  check(
    'v_gap menghasilkan nilai identik untuk keempat konteks',
    JSON.stringify(gapAnon) === JSON.stringify(gapA) &&
      JSON.stringify(gapAnon) === JSON.stringify(gapB) &&
      JSON.stringify(gapAnon) === JSON.stringify(gapAdmin),
  );
  check(
    'v_gap menampilkan jumlah partisipan lintas pengguna',
    gapAnon.every((row) => Number(row.jumlah_partisipan) === 2),
  );
  const gapEducation = gapAnon.find((row) => row.kategori === 'Pendidikan');
  const gapHealth = gapAnon.find((row) => row.kategori === 'Kesehatan');
  check(
    'v_gap mengikuti rasio nominal gabungan untuk alokasi parsial dengan jumlah berbeda',
    Number(gapEducation?.persen_warga) === 63.64 && Number(gapHealth?.persen_warga) === 36.36,
  );
  check(
    'v_gap tidak menyatakan APBD tersedia tanpa item verified_program',
    gapAnon.every((row) => row.apbd_tersedia === false),
  );
  const publicStatsAnon = await rows('v_public_stats', null);
  const publicStatsWarga = await rows('v_public_stats', a);
  const publicStatsAdmin = await rows('v_public_stats', admin);
  check(
    'Statistik publik identik untuk anon, warga, dan admin',
    JSON.stringify(publicStatsAnon) === JSON.stringify(publicStatsWarga) &&
      JSON.stringify(publicStatsAnon) === JSON.stringify(publicStatsAdmin) &&
      Number(publicStatsAnon[0]?.jumlah_partisipan_alokasi) === 2 &&
      Number(publicStatsAnon[0]?.total_alokasi_warga) === baselineAllocationTotal + 11000000,
  );
  const statsAdminOnly = await request<{ total_pengguna: number }[]>(
    '/rest/v1/v_admin_stats',
    admin,
  );
  const statsAnon = await request<unknown>('/rest/v1/v_admin_stats', null);
  const statsWarga = await request<unknown>('/rest/v1/v_admin_stats', a);
  const hiddenFromNonAdmin = (response: { status: number; data: unknown }) => {
    if (response.status === 200) return Array.isArray(response.data) && response.data.length === 0;
    const code =
      typeof response.data === 'object' && response.data !== null && 'code' in response.data
        ? response.data.code
        : undefined;
    return [401, 403].includes(response.status) || (response.status === 400 && code === '42501');
  };
  check(
    `Statistik admin hanya tersedia bagi admin (anon HTTP ${statsAnon.status}, warga HTTP ${statsWarga.status})`,
    statsAdminOnly.status === 200 &&
      statsAdminOnly.data.length === 1 &&
      hiddenFromNonAdmin(statsAnon) &&
      hiddenFromNonAdmin(statsWarga),
  );
  const privateSchemaResponse = await fetch(`${apiUrl}/rest/v1/rpc/is_admin`, {
    headers: {
      apikey: process.env.INTEGRATION_ANON_KEY!,
      Authorization: `Bearer ${a.token}`,
      'Accept-Profile': 'private',
    },
    signal: AbortSignal.timeout(10000),
  });
  check('Schema private tidak diekspos melalui Data API', privateSchemaResponse.status === 406);
  const graphqlSchemaResponse = await fetch(`${apiUrl}/rest/v1/v_gap?select=kategori&limit=0`, {
    headers: {
      apikey: process.env.INTEGRATION_ANON_KEY!,
      Authorization: `Bearer ${a.token}`,
      'Accept-Profile': 'graphql_public',
    },
    signal: AbortSignal.timeout(10000),
  });
  check('Schema GraphQL tidak diekspos melalui Data API', graphqlSchemaResponse.status === 406);
  const invalids = [
    [{ kategori: 'Pendidikan', jumlah: 10000001 }],
    [{ kategori: 'Pendidikan', jumlah: -1 }],
    [{ kategori: 'Pendidikan', jumlah: 1.5 }],
    [{ kategori: 'Asing', jumlah: 1 }],
    [
      { kategori: 'Pendidikan', jumlah: 1 },
      { kategori: 'Pendidikan', jumlah: 2 },
    ],
  ];
  for (const [index, payload] of invalids.entries()) {
    const response = await request<{ code: string }>('/rest/v1/rpc/save_allocations', a, 'POST', {
      p_rows: payload,
    });
    check(
      `RPC menolak payload invalid ${index + 1}`,
      response.status === 400 && response.data.code === (index === 0 ? '22003' : '22023'),
    );
  }
  check(
    'Alokasi lama utuh setelah payload invalid',
    (await rows(`allocations?user_id=eq.${a.id}`, a)).reduce(
      (sum, row) => sum + Number(row.jumlah),
      0,
    ) === 10000000,
  );
  const privateRpc = await request('/rest/v1/rpc/can_read_proposal', a, 'POST', { p_id: p });
  check('Helper private tidak diekspos sebagai RPC', privateRpc.status === 404);
  const httpRaces = await Promise.all([
    request('/rest/v1/rpc/save_allocations', a, 'POST', {
      p_rows: [
        { kategori: 'Pendidikan', jumlah: 6000000 },
        { kategori: 'Kesehatan', jumlah: 4000000 },
      ],
    }),
    request('/rest/v1/rpc/save_allocations', a, 'POST', {
      p_rows: [
        { kategori: 'Pendidikan', jumlah: 7000000 },
        { kategori: 'Kesehatan', jumlah: 3000000 },
      ],
    }),
  ]);
  check(
    'Dua RPC alokasi HTTP bersamaan berhasil',
    httpRaces.every((response) => response.status === 204),
  );
  const httpRaceRows = await rows(`allocations?user_id=eq.${a.id}`, a);
  const httpRaceTotal = httpRaceRows.reduce((sum, row) => sum + Number(row.jumlah), 0);
  const httpRaceSet = httpRaceRows
    .map((row) => `${row.kategori}:${row.jumlah}`)
    .sort()
    .join('|');
  check(
    'Dua RPC HTTP meninggalkan satu set alokasi utuh dalam batas budget',
    httpRaceTotal === 10000000 &&
      ['Kesehatan:3000000|Pendidikan:7000000', 'Kesehatan:4000000|Pendidikan:6000000'].includes(
        httpRaceSet,
      ),
  );
  await concurrency(a);

  const refresh = await request<Session>('/auth/v1/token?grant_type=refresh_token', null, 'POST', {
    refresh_token: a.refresh,
  });
  check('Refresh token diterima Auth', refresh.status === 200 && refresh.data.user.id === a.id);
  a.token = refresh.data.access_token;
  a.refresh = refresh.data.refresh_token;
  check(
    'JWT hasil refresh bekerja pada PostgREST',
    (await rows(`profiles?id=eq.${a.id}`, a)).length === 1,
  );
  check(
    'Logout Auth berhasil',
    (await request('/auth/v1/logout?scope=global', a, 'POST')).status === 204,
  );
  check(
    'Refresh setelah logout ditolak',
    (
      await request('/auth/v1/token?grant_type=refresh_token', null, 'POST', {
        refresh_token: a.refresh,
      })
    ).status === 400,
  );
  const relogin = await request<Session>('/auth/v1/token?grant_type=password', null, 'POST', {
    email: a.email,
    password,
  });
  check(
    'Login kembali setelah logout berhasil',
    relogin.status === 200 && relogin.data.user.id === a.id,
  );
  const sessionClient = createClient(apiUrl, process.env.INTEGRATION_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const loginA = await sessionClient.auth.signInWithPassword({ email: a.email, password });
  check('Client sesi masuk sebagai A', !loginA.error && loginA.data.user?.id === a.id);
  const ownA = await sessionClient.from('profiles').select('id').eq('id', a.id);
  check('Client sesi A membaca profil A', !ownA.error && ownA.data?.length === 1);
  const logoutA = await sessionClient.auth.signOut({ scope: 'local' });
  check('Client sesi keluar dari A', !logoutA.error);
  const loginB = await sessionClient.auth.signInWithPassword({ email: b.email, password });
  check('Client sesi yang sama masuk sebagai B', !loginB.error && loginB.data.user?.id === b.id);
  const hiddenA = await sessionClient.from('profiles').select('id').eq('id', a.id);
  const ownBProfile = await sessionClient.from('profiles').select('id').eq('id', b.id);
  check(
    'Setelah pergantian sesi B tidak membaca profil A',
    !hiddenA.error && hiddenA.data?.length === 0,
  );
  check(
    'Setelah pergantian sesi B membaca profil sendiri',
    !ownBProfile.error && ownBProfile.data?.length === 1,
  );
  const logoutB = await sessionClient.auth.signOut({ scope: 'local' });
  check('Client sesi keluar dari B', !logoutB.error);

  // Access JWT lama dapat hidup sampai expiry; tidak mengklaim logout langsung
  // mencabut seluruh access token stateless pada PostgREST.
  check('API yang dipakai tetap localhost', new URL(apiUrl).hostname === '127.0.0.1');
}

let failure: unknown;
try {
  if (process.argv.includes('--concurrency-only')) {
    await beginFixtureRun();
    const actor = await signup('race', `Local!${crypto.randomUUID()}aZ9`, { nama: 'Race fixture' });
    await concurrency(actor);
  } else {
    await run();
  }
} catch (error) {
  failure = error;
} finally {
  try {
    await cleanup();
  } catch (error) {
    failure ??= error;
  }
  await saveReport(failure);
  await db.close();
}
if (failure) process.exitCode = 1;
