import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gagal, JudulHalaman, Memuat } from '../components/Halaman';
import { Kartu } from '../components/Kartu';
import { NamaKategori, StatusPill } from '../components/Label';
import { TombolLink } from '../components/Tombol';
import { ambilUsulan } from '../lib/data';
import { formatRupiah } from '../lib/format';
import { TAHAP } from '../lib/status';
import { useMuat } from '../lib/useMuat';

const FILTER = ['Semua', ...TAHAP];

export default function Usulan() {
  const navigate = useNavigate();
  const { data, memuat, galat, ulangi } = useMuat(ambilUsulan);
  const [filter, setFilter] = useState('Semua');
  const usulan = (data ?? []).filter((u) => filter === 'Semua' || u.status === filter);

  return (
    <>
      <JudulHalaman
        judul="Usulan warga"
        sub="Program yang diusulkan warga. Status mengikuti tindak lanjut: Diajukan, Diverifikasi, Masuk APBD, Dikerjakan, Selesai."
        aksi={
          <TombolLink to="/usulan/baru" varian="utama">
            Buat usulan
          </TombolLink>
        }
      />

      <div role="group" aria-label="Saring menurut status" className="mb-4 flex flex-wrap gap-2">
        {FILTER.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="h-9 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium transition-transform duration-150 ease-out active:scale-[0.97] aria-pressed:border-hijau aria-pressed:bg-hijau aria-pressed:text-white"
          >
            {f}
          </button>
        ))}
      </div>

      {memuat ? (
        <Memuat apa="usulan" />
      ) : galat ? (
        <Gagal apa="usulan" pesan={galat} ulangi={ulangi} />
      ) : (
        <Kartu className="px-4! py-2! sm:px-6!">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-[13px] text-muted">
                <th className="py-3 pr-3 font-normal">Usulan</th>
                <th className="hidden py-3 pr-3 font-normal md:table-cell">Program</th>
                <th className="hidden py-3 pr-3 text-right font-normal sm:table-cell">
                  Estimasi biaya
                </th>
                <th className="py-3 text-right font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {usulan.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted">
                    {filter === 'Semua' ? (
                      <>
                        Belum ada usulan.{' '}
                        <Link to="/usulan/baru" className="font-semibold text-warga underline">
                          Buat usulan pertama
                        </Link>
                        .
                      </>
                    ) : (
                      `Belum ada usulan berstatus ${filter}.`
                    )}
                  </td>
                </tr>
              ) : (
                usulan.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/usulan/${u.id}`)}
                    className="cursor-pointer border-b border-rule last:border-b-0 hover:bg-ground"
                  >
                    <td className="py-3.5 pr-3">
                      <Link to={`/usulan/${u.id}`} className="font-semibold">
                        {u.judul}
                      </Link>
                      <span className="block text-[13px] text-muted">
                        {u.lokasi ?? 'Tanpa lokasi'}
                        <span className="md:hidden"> · {u.kategori}</span>
                      </span>
                    </td>
                    <td className="hidden py-3.5 pr-3 md:table-cell">
                      <NamaKategori kategori={u.kategori} />
                    </td>
                    <td className="hidden py-3.5 pr-3 text-right sm:table-cell">
                      {formatRupiah(u.estimasi_biaya)}
                    </td>
                    <td className="py-3.5 text-right">
                      <StatusPill status={u.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Kartu>
      )}
    </>
  );
}
