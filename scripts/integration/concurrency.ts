import { check, db, request, type Actor } from './harness';

export async function concurrency(actor: Actor) {
  for (const scenario of ['kosong', 'sudah terisi', 'payload kedua invalid']) {
    const initial = scenario === 'kosong' ? [] : [{ kategori: 'Kesehatan', jumlah: 3000000 }];
    check(
      `Concurrency ${scenario}: fixture API`,
      (await request('/rest/v1/rpc/save_allocations', actor, 'POST', { p_rows: initial }))
        .status === 204,
    );
    const first = await db.reserve();
    const second = await db.reserve();
    let pending: Promise<{ ok: boolean; code?: string }> | undefined;
    try {
      const firstPid = (await first`SELECT pg_backend_pid() AS pid`)[0].pid;
      const secondPid = (await second`SELECT pg_backend_pid() AS pid`)[0].pid;
      check(`Concurrency ${scenario}: dua koneksi berbeda`, firstPid !== secondPid);
      for (const connection of [first, second]) {
        await connection.unsafe('BEGIN');
        await connection.unsafe("SET LOCAL statement_timeout = '12s'");
        await connection.unsafe("SET LOCAL lock_timeout = '10s'");
        await connection.unsafe('SET LOCAL ROLE authenticated');
        await connection`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: actor.id, role: 'authenticated' })}, true), set_config('request.jwt.claim.sub', ${actor.id}, true)`;
        const identity = await connection`SELECT current_user AS role, auth.uid()::text AS uid`;
        check(
          `Concurrency ${scenario}: koneksi memakai identitas Auth warga`,
          identity[0].role === 'authenticated' && identity[0].uid === actor.id,
        );
      }
      // Bun.SQL mengenkode parameter jsonb sendiri. Stringify di sini akan
      // mengirim JSON string, bukan array yang diwajibkan RPC.
      const left = [{ kategori: 'Pendidikan', jumlah: 10000000 }];
      const right = [
        {
          kategori: 'Kesehatan',
          jumlah: scenario === 'payload kedua invalid' ? 10000001 : 9000000,
        },
      ];
      await first`SELECT public.save_allocations(${left}::jsonb)`;
      pending = (async () => {
        try {
          await second`SELECT public.save_allocations(${right}::jsonb)`;
          await second.unsafe('COMMIT');
          return { ok: true };
        } catch (error) {
          await second.unsafe('ROLLBACK');
          return { ok: false, code: (error as { errno?: string }).errno };
        }
      })();
      let blocked = false;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const locks =
          await db`SELECT ${firstPid}::int = ANY(pg_blocking_pids(${secondPid}::int)) AS blocked`;
        if (locks[0].blocked) {
          blocked = true;
          break;
        }
        await Bun.sleep(50);
      }
      check(`Concurrency ${scenario}: koneksi kedua benar-benar menunggu lock pertama`, blocked);
      await first.unsafe('COMMIT');
      const result = await pending;
      check(
        `Concurrency ${scenario}: hasil transaksi kedua`,
        scenario === 'payload kedua invalid' ? !result.ok && result.code === '22003' : result.ok,
      );
      const allocations =
        await db`SELECT kategori, jumlah::text AS jumlah FROM public.allocations WHERE user_id=${actor.id}::uuid`;
      check(
        `Concurrency ${scenario}: set utuh tanpa gabungan`,
        allocations.length === 1 &&
          allocations[0].kategori ===
            (scenario === 'payload kedua invalid' ? 'Pendidikan' : 'Kesehatan'),
      );
      check(
        `Concurrency ${scenario}: nominal akhir benar dan tidak melebihi budget`,
        Number(allocations[0]?.jumlah) ===
          (scenario === 'payload kedua invalid' ? 10000000 : 9000000),
      );
    } finally {
      await first.unsafe('ROLLBACK');
      if (pending) await pending;
      await second.unsafe('ROLLBACK');
      first.release();
      second.release();
    }
  }
}
