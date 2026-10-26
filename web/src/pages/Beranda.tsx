import { Link } from 'react-router-dom';
import { Popup } from 'react-leaflet';
import { Gagal, JudulHalaman, Kosong, Memuat } from '../components/Halaman';
import { Kartu, KartuHero } from '../components/Kartu';
import { NamaKategori, StatusPill } from '../components/Label';
import { Marker, Peta, penandaHijau } from '../components/PetaUsulan';
import { TombolLink } from '../components/Tombol';
import { ambilUsulan } from '../lib/data';
import { formatRupiah } from '../lib/format';
import { useMuat } from '../lib/useMuat';

export default function Beranda() {
  const { data: usulan, memuat, galat, ulangi } = useMuat(ambilUsulan);
  const denganLokasi = (usulan ?? []).filter((u) => u.latitude !== null && u.longitude !== null);

  return (
    <>
      <JudulHalaman
        judul="Anggaran kota, diputuskan bersama"
        sub="Usulkan program, bagi anggaran virtual Rp10.000.000, dukung usulan warga lain, lalu bandingkan prioritas warga dengan APBD yang sebenarnya."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Kartu className="p-3! sm:p-3!">
          <h2 className="px-2 pt-1 pb-3 font-semibold">Peta usulan warga</h2>
          {memuat ? (
            <Memuat apa="peta usulan" />
          ) : galat ? (
            <Gagal apa="peta usulan" pesan={galat} ulangi={ulangi} />
          ) : denganLokasi.length === 0 ? (
            <Kosong>Belum ada usulan yang punya titik di peta.</Kosong>
          ) : (
            <Peta tinggi="h-[360px] lg:h-[420px]">
              {denganLokasi.map((u) => (
                <Marker key={u.id} position={[u.latitude!, u.longitude!]} icon={penandaHijau}>
                  <Popup>
                    <Link to={`/usulan/${u.id}`} className="font-semibold text-ink underline">
                      {u.judul}
                    </Link>
                    <div className="mt-1 text-muted">{u.kategori}</div>
                  </Popup>
                </Marker>
              ))}
            </Peta>
          )}
        </Kartu>

        <KartuHero className="flex flex-col">
          <h2 className="text-lg font-bold">Bagi Rp10.000.000 versimu</h2>
          <p className="mt-2 text-white/80">
            Geser dana virtual ke 10 program kota. Pilihanmu digabung dengan warga lain dan
            dibandingkan dengan APBD.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <TombolLink to="/simulator" className="bg-white text-ink hover:bg-ground">
              Buka simulator
            </TombolLink>
            <TombolLink
              to="/bandingkan"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Lihat selisih warga dan APBD
            </TombolLink>
          </div>
        </KartuHero>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="text-lg font-bold">Usulan terbaru</h2>
          <Link
            to="/usulan"
            className="text-sm font-semibold text-warga underline underline-offset-4"
          >
            Semua usulan
          </Link>
        </div>
        {memuat ? (
          <Memuat apa="usulan" />
        ) : galat ? (
          <Gagal apa="usulan" pesan={galat} ulangi={ulangi} />
        ) : (usulan ?? []).length === 0 ? (
          <Kosong>
            Belum ada usulan.{' '}
            <Link to="/usulan/baru" className="font-semibold text-warga underline">
              Buat usulan pertama
            </Link>
            .
          </Kosong>
        ) : (
          <Kartu className="py-2! sm:py-2!">
            <ul>
              {(usulan ?? []).slice(0, 4).map((u) => (
                <li key={u.id} className="border-t border-rule first:border-t-0">
                  <Link
                    to={`/usulan/${u.id}`}
                    className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{u.judul}</span>
                      <span className="block text-sm text-muted">{u.lokasi ?? 'Tanpa lokasi'}</span>
                    </span>
                    <span className="flex flex-none flex-wrap items-center gap-3 text-sm">
                      <NamaKategori kategori={u.kategori} />
                      <span className="text-muted">{formatRupiah(u.estimasi_biaya)}</span>
                      <StatusPill status={u.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Kartu>
        )}
      </section>
    </>
  );
}
