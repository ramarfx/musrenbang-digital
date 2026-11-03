export const applicationTableOrder: Record<string, string> = {
  profiles: 'id',
  categories: 'id',
  apbd_items: 'id',
  proposals: 'id',
  proposal_status_history: 'id',
  votes: 'id',
  comments: 'id',
  allocations: 'id',
  priority_rankings: 'user_id, kategori',
  config: 'kunci',
};

export type TableSnapshot = Record<string, { count: number; fingerprint: string }>;

type ReadOnlySql = {
  begin<T>(options: string, callback: (transaction: ReadOnlySql) => Promise<T>): Promise<T>;
  unsafe(sql: string): Promise<{ count: number; fingerprint: string }[]>;
};

export async function snapshotApplicationTables(db: ReadOnlySql): Promise<TableSnapshot> {
  return db.begin('READ ONLY', async (transaction) => {
    const snapshot: TableSnapshot = {};
    for (const [table, order] of Object.entries(applicationTableOrder)) {
      const sql = `SELECT count(*)::int AS count, md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY ${order}), '')) AS fingerprint FROM public.${table} t`;
      const rows = await transaction.unsafe(sql);
      snapshot[table] = rows[0];
    }
    return snapshot;
  });
}
