import { describe, expect, test } from 'bun:test';
import { parseConfigRows } from './config';

describe('parseConfigRows', () => {
  test('memakai default bila config kosong', () => {
    const config = parseConfigRows([]);
    expect(config.kota).toBe('DKI Jakarta');
    expect(config.tahunAnggaran).toBe(2026);
    expect(config.virtualBudgetPerWarga).toBe(10_000_000);
  });

  test('mengubah baris key-value menjadi objek bertipe', () => {
    const config = parseConfigRows([
      { kunci: 'kota', nilai: 'Bandung' },
      { kunci: 'tahun_anggaran', nilai: '2027' },
      { kunci: 'virtual_budget_per_warga', nilai: '5000000' },
    ]);
    expect(config).toEqual({
      kota: 'Bandung',
      tahunAnggaran: 2027,
      virtualBudgetPerWarga: 5_000_000,
    });
  });

  test('menolak anggaran nol', () => {
    expect(() => parseConfigRows([{ kunci: 'virtual_budget_per_warga', nilai: '0' }])).toThrow();
  });
});
