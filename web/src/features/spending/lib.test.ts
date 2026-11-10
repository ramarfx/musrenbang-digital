import { describe, expect, test } from 'bun:test';
import { spendingInputSchema } from '@musrenbang/shared';
import { angkaDariKetikan, persenDari, sumberBerupaTautan, totalPengeluaran } from './lib';

describe('totalPengeluaran', () => {
  test('koreksi minus mengurangi total', () => {
    expect(totalPengeluaran([{ jumlah: 250 }, { jumlah: 130 }, { jumlah: -5 }])).toBe(375);
  });

  test('tanpa catatan totalnya nol', () => {
    expect(totalPengeluaran([])).toBe(0);
  });
});

describe('persenDari', () => {
  test('menghitung persen terhadap pembanding', () => {
    expect(persenDari(375, 420)).toBeCloseTo(89.2857, 3);
  });

  test('tanpa pembanding hasilnya kosong, bukan pembagian dengan nol', () => {
    expect(persenDari(375, 0)).toBeNull();
    expect(persenDari(375, null)).toBeNull();
  });
});

describe('angkaDariKetikan', () => {
  test('membuang pemisah dan huruf', () => {
    expect(angkaDariKetikan('Rp 250.000.000')).toBe(250_000_000);
  });

  test('kosong menjadi nol', () => {
    expect(angkaDariKetikan('')).toBe(0);
    expect(angkaDariKetikan('abc')).toBe(0);
  });
});

describe('sumberBerupaTautan', () => {
  test('hanya http dan https yang dianggap tautan', () => {
    expect(sumberBerupaTautan('https://contoh.go.id/dokumen.pdf')).toBe(true);
    expect(sumberBerupaTautan('javascript:alert(1)')).toBe(false);
    expect(sumberBerupaTautan('Kontrak 027/PU-SDA/2026')).toBe(false);
  });
});

describe('spendingInputSchema', () => {
  test('jumlah nol ditolak', () => {
    const hasil = spendingInputSchema.safeParse({
      proposalId: 1,
      jumlah: 0,
      keterangan: 'Termin 1',
    });
    expect(hasil.success).toBe(false);
  });

  test('keterangan terlalu pendek ditolak', () => {
    const hasil = spendingInputSchema.safeParse({ proposalId: 1, jumlah: 100, keterangan: 'ab' });
    expect(hasil.success).toBe(false);
  });

  test('masukan yang benar diterima', () => {
    const hasil = spendingInputSchema.safeParse({
      proposalId: 1,
      jumlah: 250_000_000,
      keterangan: 'Pembelian 2 unit pompa mobile',
      sumber: 'Kontrak 027/PU-SDA/2026',
    });
    expect(hasil.success).toBe(true);
  });
});
