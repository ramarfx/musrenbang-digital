import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Gagal, JudulHalaman, Kosong, Memuat } from '../components/Halaman';
import { Kartu, KartuHero } from '../components/Kartu';
import { NamaKategori } from '../components/Label';
import { ambilGap } from '../lib/data';
import { formatPersen, formatRupiah } from '../lib/format';
import { useMuat } from '../lib/useMuat';

// Tampilan lengkap Desain 1 (bar dua arah, kartu selisih) menyusul di Fase 3.
export default function Bandingkan() {
  const { data, memuat, galat, ulangi } = useMuat(async () =>
    (await ambilGap()).sort((a, b) => Math.abs(b.gap_poin_persen) - Math.abs(a.gap_poin_persen)),
  );
  const items = data ?? [];
  const sorotan = items[0];

  return (
    <>
      <JudulHalaman
        judul="Bandingkan dengan APBD"
        sub="Persentase alokasi warga dibanding persentase APBD per kategori. Gap positif berarti warga memprioritaskan kategori itu lebih tinggi daripada APBD."
      />

      {memuat ? (
        <Memuat apa="perbandingan" />
      ) : galat ? (
        <Gagal apa="perbandingan" pesan={galat} ulangi={ulangi} />
      ) : items.length === 0 ? (
        <Kosong>Belum ada data gap. Seed APBD belum dimuat ke database.</Kosong>
      ) : (
        <div className="flex flex-col gap-6">
          {sorotan && (
            <KartuHero>
              <p className="text-sm text-white/75">Gap terbesar: {sorotan.kategori}</p>
              <p className="mt-2 max-w-[62ch] text-lg leading-snug font-semibold">
                Warga mengalokasikan {formatPersen(sorotan.persen_warga)} untuk {sorotan.kategori},
                sementara APBD mengalokasikan {formatPersen(sorotan.persen_apbd)}. Selisihnya{' '}
                {sorotan.gap_poin_persen.toLocaleString('id-ID')} poin persen.
              </p>
            </KartuHero>
          )}

          <Kartu>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={items} layout="vertical" margin={{ right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="#EFEAE1" />
                  <XAxis type="number" unit="%" stroke="#5E6A70" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="kategori"
                    width={170}
                    fontSize={12}
                    stroke="#5E6A70"
                  />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="persen_warga" name="Warga" fill="#047857" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="persen_apbd" name="APBD" fill="#14222B" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Kartu>

          <Kartu className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-[13px] text-muted">
                  <th className="py-3 pr-3 font-normal">Kategori</th>
                  <th className="py-3 pr-3 text-right font-normal">Warga</th>
                  <th className="py-3 pr-3 text-right font-normal">APBD</th>
                  <th className="py-3 pr-3 text-right font-normal">Gap</th>
                  <th className="py-3 text-right font-normal">Nominal APBD</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.kategori} className="border-b border-rule last:border-b-0">
                    <td className="py-3.5 pr-3">
                      <NamaKategori kategori={item.kategori} />
                    </td>
                    <td className="py-3.5 pr-3 text-right">{formatPersen(item.persen_warga)}</td>
                    <td className="py-3.5 pr-3 text-right">{formatPersen(item.persen_apbd)}</td>
                    <td className="py-3.5 pr-3 text-right font-semibold whitespace-nowrap">
                      {item.gap_poin_persen > 0 ? '+' : ''}
                      {item.gap_poin_persen.toLocaleString('id-ID')} poin
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      {item.nominal_apbd > 0 ? (
                        formatRupiah(item.nominal_apbd)
                      ) : (
                        <span className="text-muted">Data menyusul</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Kartu>
        </div>
      )}
    </>
  );
}
