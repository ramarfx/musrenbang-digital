/** Skenario memakai adapter HTTP runner, bukan koneksi SQL atau kunci service role. */
type Actor = { id: string; token: string };
type Result = { status: number; data: unknown };
type Request = (
  path: string,
  actor: Actor | null,
  method?: string,
  body?: unknown,
) => Promise<Result>;
type Row = { kategori: string; posisi: number };
const ok = (r: Result) => r.status === 200 || r.status === 204;
const denied = (r: Result) => r.status >= 400 && r.status < 500;
const rows = (r: Result): Record<string, unknown>[] =>
  Array.isArray(r.data) ? (r.data as Record<string, unknown>[]) : [];
const canonical = (v: unknown) => JSON.stringify(v);

export async function testPriorityRankings(
  request: Request,
  check: (name: string, result: boolean) => void,
  a: Actor,
  b: Actor,
  admin: Actor,
) {
  const categories = await request('/rest/v1/categories?select=nama&order=nama', a);
  const names = rows(categories).map((r) => String(r.nama));
  check(
    'Ranking memakai tepat 10 kategori',
    categories.status === 200 && names.length === 10 && new Set(names).size === 10,
  );
  const ranking: Row[] = names.map((kategori, i) => ({ kategori, posisi: i + 1 }));
  const reverse = ranking.map((r) => ({ ...r, posisi: 11 - r.posisi }));
  const save = (actor: Actor | null, p_rows: Row[]) =>
    request('/rest/v1/rpc/save_priority_rankings', actor, 'POST', { p_rows });
  const read = (actor: Actor | null) =>
    request('/rest/v1/rpc/get_priority_rankings', actor, 'POST', {});
  const summary = (actor: Actor | null) =>
    request('/rest/v1/rpc/get_priority_ranking_summary', actor, 'POST', {});
  check('Anon tidak menyimpan ranking', denied(await save(null, ranking)));
  check('Anon tidak membaca ranking', denied(await read(null)));
  check('Anon tidak membaca agregat ranking', denied(await summary(null)));
  check('Warga tidak membaca agregat admin', denied(await summary(a)));
  check('Ranking fixture A awal kosong', rows(await read(a)).length === 0);
  const allocationsBefore = await request(
    `/rest/v1/allocations?user_id=eq.${a.id}&select=kategori,jumlah&order=kategori`,
    a,
  );
  check(
    'Alokasi awal A dapat dibaca',
    allocationsBefore.status === 200 && Array.isArray(allocationsBefore.data),
  );
  const aggregateBefore = await summary(admin);
  check(
    'Admin dapat membaca agregat ranking',
    aggregateBefore.status === 200 && Array.isArray(aggregateBefore.data),
  );
  check('Warga A menyimpan ranking valid', ok(await save(a, ranking)));
  const own = await read(a);
  check(
    'Warga A membaca ranking sendiri berurutan',
    own.status === 200 && canonical(own.data) === canonical(ranking),
  );
  const other = await request(
    `/rest/v1/priority_rankings?user_id=eq.${a.id}&select=kategori,posisi`,
    b,
  );
  check('Warga B tidak membaca ranking A', other.status === 200 && rows(other).length === 0);
  check(
    'B tidak melihat ranking A lewat RPC sendiri',
    (await read(b)).status === 200 && rows(await read(b)).length === 0,
  );
  check(
    'Warga tidak menulis tabel ranking langsung',
    denied(
      await request('/rest/v1/priority_rankings', a, 'POST', { user_id: a.id, ...ranking[0] }),
    ),
  );
  const duplicateCategory = ranking.map((r, i) =>
    i === 1 ? { ...r, kategori: ranking[0].kategori } : r,
  );
  const duplicatePosition = ranking.map((r, i) =>
    i === 1 ? { ...r, posisi: ranking[0].posisi } : r,
  );
  for (const [label, payload] of [
    ['tidak lengkap', ranking.slice(0, 9)],
    ['kategori duplikat', duplicateCategory],
    ['posisi duplikat', duplicatePosition],
    [
      'kategori tidak dikenal',
      ranking.map((r, i) => (i === 0 ? { ...r, kategori: '__unknown__' } : r)),
    ],
  ] as const) {
    check(`Validasi ranking ${label}`, denied(await save(a, payload)));
  }
  check(
    'Kegagalan validasi mempertahankan ranking A',
    canonical((await read(a)).data) === canonical(ranking),
  );
  check('Pembaruan ranking A berhasil', ok(await save(a, reverse)));
  check('Warga B menyimpan ranking sendiri', ok(await save(b, ranking)));
  const allocationAfter = await request(
    `/rest/v1/allocations?user_id=eq.${a.id}&select=kategori,jumlah&order=kategori`,
    a,
  );
  check(
    'Penyimpanan ranking tidak mengubah allocations',
    allocationAfter.status === 200 &&
      canonical(allocationAfter.data) === canonical(allocationsBefore.data),
  );
  check(
    'RPC alokasi tetap menerima anggaran valid',
    ok(
      await request('/rest/v1/rpc/save_allocations', a, 'POST', {
        p_rows: [{ kategori: names[0], jumlah: 10000000 }],
      }),
    ),
  );
  check(
    'RPC alokasi menolak anggaran berlebih',
    denied(
      await request('/rest/v1/rpc/save_allocations', a, 'POST', {
        p_rows: [{ kategori: names[0], jumlah: 10000001 }],
      }),
    ),
  );
  const expectedReverse = [...reverse].sort((x, y) => x.posisi - y.posisi);
  check(
    'Alokasi tidak mengubah ranking',
    canonical((await read(a)).data) === canonical(expectedReverse),
  );
  const aggregateAfter = await summary(admin);
  const before = rows(aggregateBefore);
  const after = rows(aggregateAfter);
  check(
    'Agregat Borda mencakup dua fixture',
    aggregateAfter.status === 200 &&
      after.length === 10 &&
      after.every((r) => Number(r.jumlah_partisipan) >= 2 && Number(r.skor) >= 11),
  );
  if (before.length === 10) {
    check(
      'Agregat bertambah tepat 11 poin per kategori',
      after.every((r) => {
        const old = before.find((x) => x.kategori === r.kategori);
        return (
          old !== undefined &&
          Number(r.skor) === Number(old.skor) + 11 &&
          Number(r.jumlah_partisipan) === Number(old.jumlah_partisipan) + 2
        );
      }),
    );
  }
}
