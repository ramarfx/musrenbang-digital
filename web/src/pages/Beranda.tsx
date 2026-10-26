import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { formatRupiah, formatTanggal } from '../lib/format';
import type { Proposal } from '../lib/supabase';
import { supabase } from '../lib/supabase';

// Perbaikan ikon marker bawaan Leaflet di bundler Vite.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const STATUS_WARNA: Record<string, string> = {
  Diajukan: 'bg-stone-200 text-stone-800',
  Diverifikasi: 'bg-sky-200 text-sky-800',
  'Masuk APBD': 'bg-amber-200 text-amber-800',
  Dikerjakan: 'bg-emerald-200 text-emerald-800',
  Selesai: 'bg-teal-700 text-white',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_WARNA[status] ?? 'bg-stone-200'}`}
    >
      {status}
    </span>
  );
}

export default function Beranda() {
  const [usulan, setUsulan] = useState<Proposal[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    supabase
      .from('proposals')
      .select('*')
      .order('dibuat_pada', { ascending: false })
      .then(({ data }) => {
        setUsulan((data as Proposal[]) ?? []);
        setMemuat(false);
      });
  }, []);

  const denganLokasi = usulan.filter((u) => u.latitude !== null && u.longitude !== null);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold">Anggaran kota, diputuskan bersama.</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Usulkan program, alokasikan anggaran virtual Rp10.000.000, beri suara, dan bandingkan
          prioritas warga dengan APBD yang sebenarnya.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            to="/simulator"
            className="rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Coba Simulator Anggaran
          </Link>
          <Link
            to="/bandingkan"
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-amber-400"
          >
            Lihat Gap Warga-APBD
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Peta Usulan</h2>
        {denganLokasi.length === 0 ? (
          <p className="rounded border border-dashed border-stone-300 p-6 text-center text-stone-500">
            Belum ada usulan berlokasi di peta.
          </p>
        ) : (
          <MapContainer
            center={[-6.2088, 106.8456]}
            zoom={11}
            className="h-96 w-full rounded border border-stone-200"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {denganLokasi.map((u) => (
              <Marker key={u.id} position={[u.latitude!, u.longitude!]}>
                <Popup>
                  <Link to={`/usulan/${u.id}`} className="font-medium">
                    {u.judul}
                  </Link>
                  <div>{u.kategori}</div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Daftar Usulan</h2>
        {memuat ? (
          <p className="text-stone-500">Memuat usulan...</p>
        ) : usulan.length === 0 ? (
          <p className="rounded border border-dashed border-stone-300 p-6 text-center text-stone-500">
            Belum ada usulan. Jadilah yang pertama lewat halaman Buat Usulan.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {usulan.map((u) => (
              <Link
                key={u.id}
                to={`/usulan/${u.id}`}
                className="rounded border border-stone-200 bg-white p-4 hover:border-emerald-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{u.judul}</h3>
                  <StatusBadge status={u.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-stone-600">{u.deskripsi}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-500">
                  <span>{u.kategori}</span>
                  <span>{formatRupiah(u.estimasi_biaya)}</span>
                  <span>{formatTanggal(u.dibuat_pada)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
