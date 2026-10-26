import { describe, expect, test } from 'bun:test';
import { createBudgetAllocationSchema, evenAllocation, totalAllocation } from './allocation';

const BUDGET = 10_000_000;

describe('createBudgetAllocationSchema', () => {
  test('menerima total tepat sama dengan anggaran', () => {
    const result = createBudgetAllocationSchema(BUDGET).safeParse([
      { kategori: 'Pendidikan', jumlah: 6_000_000 },
      { kategori: 'Kesehatan', jumlah: 4_000_000 },
    ]);
    expect(result.success).toBe(true);
  });

  test('menolak total melebihi anggaran', () => {
    const result = createBudgetAllocationSchema(BUDGET).safeParse([
      { kategori: 'Pendidikan', jumlah: 6_000_000 },
      { kategori: 'Kesehatan', jumlah: 4_500_000 },
    ]);
    expect(result.success).toBe(false);
  });

  test('menolak kategori duplikat', () => {
    const result = createBudgetAllocationSchema(BUDGET).safeParse([
      { kategori: 'Pendidikan', jumlah: 1_000_000 },
      { kategori: 'Pendidikan', jumlah: 2_000_000 },
    ]);
    expect(result.success).toBe(false);
  });

  test('menolak jumlah negatif dan pecahan', () => {
    expect(
      createBudgetAllocationSchema(BUDGET).safeParse([{ kategori: 'Pendidikan', jumlah: -1 }])
        .success,
    ).toBe(false);
    expect(
      createBudgetAllocationSchema(BUDGET).safeParse([{ kategori: 'Pendidikan', jumlah: 100.5 }])
        .success,
    ).toBe(false);
  });
});

describe('evenAllocation', () => {
  test('membagi anggaran tanpa melebihi batas dan sisa pembulatan masuk kategori pertama', () => {
    const categories = ['A', 'B', 'C'];
    const result = evenAllocation(categories, BUDGET);
    expect(result.map((item) => item.kategori)).toEqual(categories);
    expect(totalAllocation(result)).toBeLessThanOrEqual(BUDGET);
    expect(totalAllocation(result)).toBe(10_000_000);
    expect(result[0]?.jumlah).toBe(3_400_000);
  });
});
