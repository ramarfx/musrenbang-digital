import { describe, expect, test } from 'bun:test';
import { priorityRankingPayloadSchema } from './priority-ranking';

const valid = Array.from({ length: 10 }, (_, i) => ({ kategori: `Kategori ${i}`, posisi: i + 1 }));

describe('priorityRankingPayloadSchema', () => {
  test('menerima sepuluh kategori dan posisi unik', () => {
    expect(priorityRankingPayloadSchema.safeParse(valid).success).toBe(true);
  });
  test('menolak ranking tidak lengkap, duplikat, dan posisi di luar rentang', () => {
    expect(priorityRankingPayloadSchema.safeParse(valid.slice(1)).success).toBe(false);
    expect(priorityRankingPayloadSchema.safeParse([...valid.slice(0, 9), valid[0]]).success).toBe(
      false,
    );
    expect(
      priorityRankingPayloadSchema.safeParse(
        valid.map((v, i) => (i === 9 ? { ...v, posisi: 1 } : v)),
      ).success,
    ).toBe(false);
    expect(
      priorityRankingPayloadSchema.safeParse(
        valid.map((v, i) => (i === 9 ? { ...v, posisi: 11 } : v)),
      ).success,
    ).toBe(false);
  });
});
