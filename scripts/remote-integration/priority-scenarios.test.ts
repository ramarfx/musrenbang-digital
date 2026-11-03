import { describe, expect, test } from 'bun:test';
import { testPriorityRankings } from './priority-scenarios';

describe('skenario HTTP ranking', () => {
  test('menjalankan ketiga RPC dan memeriksa isolasi dua simulator', async () => {
    const a = { id: 'a', token: 'a' },
      b = { id: 'b', token: 'b' },
      admin = { id: 'admin', token: 'admin' };
    const rankings = new Map<string, { kategori: string; posisi: number }[]>();
    let allocation: unknown[] = [];
    const categories = Array.from({ length: 10 }, (_, i) => ({ nama: `kategori-${i}` }));
    const calls: string[] = [];
    const request = async (
      path: string,
      actor: typeof a | null,
      method = 'GET',
      body?: unknown,
    ) => {
      calls.push(path.split('?')[0]);
      const id = actor?.id;
      if (path.startsWith('/rest/v1/categories')) return { status: 200, data: categories };
      if (path.startsWith('/rest/v1/allocations')) return { status: 200, data: allocation };
      if (path === '/rest/v1/priority_rankings') return { status: 403, data: null };
      if (path.startsWith('/rest/v1/priority_rankings?')) return { status: 200, data: [] };
      if (path.endsWith('get_priority_ranking_summary')) {
        if (id !== 'admin') return { status: 403, data: null };
        const list = [...rankings.values()];
        return {
          status: 200,
          data:
            list.length < 2
              ? []
              : categories.map(({ nama }) => ({
                  kategori: nama,
                  jumlah_partisipan: list.length,
                  skor: list.reduce(
                    (n, r) => n + 11 - r.find((x) => x.kategori === nama)!.posisi,
                    0,
                  ),
                })),
        };
      }
      if (path.endsWith('get_priority_rankings'))
        return id
          ? { status: 200, data: [...(rankings.get(id) ?? [])].sort((x, y) => x.posisi - y.posisi) }
          : { status: 403, data: null };
      if (path.endsWith('save_priority_rankings')) {
        const items = (body as { p_rows: { kategori: string; posisi: number }[] }).p_rows;
        if (!id) return { status: 403, data: null };
        if (
          items.length !== 10 ||
          new Set(items.map((r) => r.kategori)).size !== 10 ||
          new Set(items.map((r) => r.posisi)).size !== 10 ||
          items.some((r) => !categories.some((c) => c.nama === r.kategori))
        )
          return { status: 400, data: null };
        rankings.set(id, items);
        return { status: 204, data: null };
      }
      if (path.endsWith('save_allocations')) {
        const items = (body as { p_rows: { jumlah: number }[] }).p_rows;
        if (items[0].jumlah > 10000000) return { status: 400, data: null };
        allocation = items;
        return { status: 204, data: null };
      }
      throw new Error('Endpoint tidak dikenal');
    };
    const checks: boolean[] = [];
    await testPriorityRankings(request, (_name, result) => checks.push(result), a, b, admin);
    expect(checks.length).toBeGreaterThanOrEqual(20);
    expect(checks.every(Boolean)).toBe(true);
    for (const rpc of [
      'save_priority_rankings',
      'get_priority_rankings',
      'get_priority_ranking_summary',
      'save_allocations',
    ])
      expect(calls).toContain(`/rest/v1/rpc/${rpc}`);
  });
});
