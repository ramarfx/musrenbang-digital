import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { GapComparison } from './GapComparison';
import { GapDetailDialog } from './GapDetailDialog';
import { siapkanGap } from '../lib';

const ringkasan = siapkanGap([
  {
    kategori: 'Pendidikan',
    persen_warga: 0,
    persen_apbd: 100,
    gap_poin_persen: -100,
    nominal_apbd: 100,
    total_alokasi_warga: 0,
    jumlah_partisipan: 0,
    apbd_tersedia: true,
  },
]);
const apbd = [
  {
    id: 1,
    kategori: 'Pendidikan',
    nominal_rp: 100,
    tahun: 2026,
    kota: 'DKI Jakarta',
    sumber: 'Sumber terverifikasi',
    sumber_url: 'https://example.invalid/a',
    catatan_pemetaan: null,
    status_verifikasi: 'verified_program' as const,
    dibuat_pada: '2026-01-01T00:00:00Z',
    diubah_pada: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    kategori: 'Pendidikan',
    nominal_rp: 50,
    tahun: 2026,
    kota: 'DKI Jakarta',
    sumber: 'Belum diperiksa',
    sumber_url: null,
    catatan_pemetaan: null,
    status_verifikasi: 'perlu_lampiran' as const,
    dibuat_pada: '2026-01-01T00:00:00Z',
    diubah_pada: '2026-01-01T00:00:00Z',
  },
];

describe('tampilan APBD campuran', () => {
  test('tabel menjelaskan sebagian meski ada angka terverifikasi', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <GapComparison
          ringkasan={ringkasan}
          onPilih={() => {}}
          statusApbd={{ Pendidikan: 'sebagian' }}
        />
      </MemoryRouter>,
    );
    expect(html).toContain('APBD sebagian terverifikasi');
    expect(html).toContain('angka hanya mencakup data terverifikasi');
  });
  test('dialog membedakan agregat dan kelengkapan serta membatasi klaim sumber', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <GapDetailDialog
          row={ringkasan.rows[0]}
          onClose={() => {}}
          ringkasan={ringkasan}
          apbd={apbd}
          konfigurasi={{ kota: 'DKI Jakarta', tahunAnggaran: 2026 }}
          statusKategoriApbd="sebagian"
        />
      </MemoryRouter>,
    );
    expect(html).toContain('Angka agregat berasal dari data terverifikasi');
    expect(html).toContain('Sebagian terverifikasi; ada data yang belum terverifikasi');
    expect(html).toContain('keterkaitan persis dengan agregat belum dapat dipastikan');
    expect(html).toContain('Sumber terverifikasi');
    expect(html).not.toContain('Belum diperiksa');
  });
  test('ketika data kategori belum tersedia, kelengkapan tidak diklaim', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <GapDetailDialog
          row={ringkasan.rows[0]}
          onClose={() => {}}
          ringkasan={ringkasan}
          apbd={[]}
          konfigurasi={undefined}
        />
      </MemoryRouter>,
    );
    expect(html).toContain('Belum dapat dipastikan');
  });
});
