import { describe, expect, test } from 'bun:test';
import {
  mockNarrative,
  processOne,
  validateNarrative,
  type Narrative,
  type SummaryJob,
} from './core';
const job: SummaryJob = {
  id: 1,
  token: 'fixture',
  sources: [{ id: 42, kategori: 'Pendidikan' }],
  coverage: 'sample',
};
describe('ringkasan aspirasi mock', () => {
  test('tema memakai sumber dan menandai sampel', () => {
    const out = mockNarrative(job.sources, job.coverage);
    expect(out.themes[0].source_ids).toEqual([42]);
    expect(out.limitations).toContain('sampel');
    expect(out.limitations).toContain('bukan isi usulan');
  });
  test('sumber asing dan angka karangan ditolak', () => {
    expect(() =>
      validateNarrative(
        {
          themes: [{ topic: 'Tema', explanation: 'Ada 5 usulan', source_ids: [42] }],
          limitations: '',
        },
        job.sources,
      ),
    ).toThrow();
    expect(() =>
      validateNarrative(
        {
          themes: [{ topic: 'Tema', explanation: 'Perlu tinjauan', source_ids: [999] }],
          limitations: '',
        },
        job.sources,
      ),
    ).toThrow();
  });
  test('kegagalan dan timeout provider tidak menghasilkan narasi', async () => {
    for (const provider of [
      async () => {
        throw Error('mock');
      },
      async () => new Promise<Narrative>(() => {}),
    ]) {
      const outputs: (Narrative | null)[] = [];
      await processOne(
        {
          claim: async () => job,
          reserve: async () => true,
          finish: async (_, output) => {
            outputs.push(output);
          },
        },
        provider,
        5,
      );
      expect(outputs).toEqual([null]);
    }
  });
  test('kuota habis tidak memanggil provider', async () => {
    let called = false;
    await processOne(
      { claim: async () => job, reserve: async () => false, finish: async () => {} },
      async () => {
        called = true;
        return mockNarrative(job.sources, job.coverage);
      },
    );
    expect(called).toBe(false);
  });
  test('data kosong tidak memanggil provider dan memberi keterbatasan', async () => {
    let reserved = 0;
    const out: (Narrative | null)[] = [];
    await processOne({
      claim: async () => ({ ...job, sources: [] }),
      reserve: async () => {
        reserved++;
        return true;
      },
      finish: async (_, value) => {
        out.push(value);
      },
    });
    expect(reserved).toBe(0);
    expect(out[0]?.limitations).toContain('belum mencukupi');
  });
});
