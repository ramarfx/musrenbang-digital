import { Gagal, JudulHalaman, Kosong, Memuat } from '../components/Halaman';
import { Kartu } from '../components/Kartu';
import { NamaKategori } from '../components/Label';
import { ambilApbd } from '../lib/data';
import { formatRupiah } from '../lib/format';
import { useMuat } from '../lib/useMuat';

export default function Apbd() {
  const { data, memuat, galat, ulangi } = useMuat(ambilApbd);
  const items = data ?? [];
  const total = items.reduce((sum, item) => sum + item.nominal_rp, 0);
  const kota = items[0]?.kota ?? 'DKI Jakarta';
  const tahun = items[0]?.tahun ?? 2026;

  return (
    <>
      <JudulHalaman
        judul={`APBD ${kota} ${tahun}`}
        sub="Angka kategori adalah hasil pemetaan dari pos APBD resmi. Total di bawah adalah total pos yang terpetakan, bukan total belanja daerah resmi."
      />

      {memuat ? (
        <Memuat apa="data APBD" />
      ) : galat ? (
        <Gagal apa="data APBD" pesan={galat} ulangi={ulangi} />
      ) : items.length === 0 ? (
        <Kosong>Belum ada data APBD. Seed APBD belum dimuat ke database.</Kosong>
      ) : (
        <Kartu className="overflow-x-auto">
          <p className="text-[13px] text-muted">Total pos terpetakan</p>
          <p className="mb-4 text-2xl font-semibold tracking-[-0.02em]">{formatRupiah(total)}</p>
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-[13px] text-muted">
                <th className="py-3 pr-3 font-normal">Kategori</th>
                <th className="py-3 pr-3 text-right font-normal">Nominal</th>
                <th className="py-3 pr-3 font-normal">Sumber</th>
                <th className="py-3 font-normal">Status data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-rule align-top last:border-b-0">
                  <td className="py-3.5 pr-3">
                    <NamaKategori kategori={item.kategori} />
                  </td>
                  <td className="py-3.5 pr-3 text-right whitespace-nowrap">
                    {item.nominal_rp > 0 ? (
                      formatRupiah(item.nominal_rp)
                    ) : (
                      <span className="text-muted">Data menyusul</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-3 text-sm text-muted">
                    {item.sumber && item.sumber !== '—' ? item.sumber : '-'}
                  </td>
                  <td className="py-3.5 text-sm whitespace-nowrap">
                    {item.status_verifikasi === 'verified_program'
                      ? 'Terverifikasi'
                      : 'Perlu lampiran'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Kartu>
      )}
    </>
  );
}
