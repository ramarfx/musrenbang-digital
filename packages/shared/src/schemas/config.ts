import { z } from 'zod';
import { APP_CONFIG_KEYS, DEFAULT_VIRTUAL_BUDGET } from '../constants';

export const configRowSchema = z.object({
  kunci: z.string().min(1),
  nilai: z.string(),
});

export type ConfigRow = z.infer<typeof configRowSchema>;

export type AppConfig = {
  kota: string;
  tahunAnggaran: number;
  virtualBudgetPerWarga: number;
};

const configValueSchema = z.object({
  kota: z.string().trim().min(1),
  tahun_anggaran: z.coerce.number().int().min(2000).max(2100),
  virtual_budget_per_warga: z.coerce.number().int().positive(),
});

const DEFAULTS = {
  kota: 'DKI Jakarta',
  tahun_anggaran: 2026,
  virtual_budget_per_warga: DEFAULT_VIRTUAL_BUDGET,
} as const;

/** Mengubah baris key-value dari tabel config menjadi objek bertipe. */
export function parseConfigRows(rows: readonly ConfigRow[]): AppConfig {
  const map = new Map(rows.map((row) => [row.kunci, row.nilai]));
  const parsed = configValueSchema.parse({
    kota: map.get(APP_CONFIG_KEYS.kota) ?? DEFAULTS.kota,
    tahun_anggaran: map.get(APP_CONFIG_KEYS.tahunAnggaran) ?? DEFAULTS.tahun_anggaran,
    virtual_budget_per_warga:
      map.get(APP_CONFIG_KEYS.virtualBudgetPerWarga) ?? DEFAULTS.virtual_budget_per_warga,
  });
  return {
    kota: parsed.kota,
    tahunAnggaran: parsed.tahun_anggaran,
    virtualBudgetPerWarga: parsed.virtual_budget_per_warga,
  };
}
