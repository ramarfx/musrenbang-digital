import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { useAuth } from '../App';
import { supabase } from '../lib/supabase';

function PemilihLokasi({ onPilih }: { onPilih: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPilih(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const inputClass = 'w-full rounded border border-stone-300 px-3 py-2';

export default function BuatUsulan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kategori, setKategori] = useState<string[]>([]);
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [kategoriDipilih, setKategoriDipilih] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [estimasi, setEstimasi] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    supabase
      .from('categories')
      .select('nama')
      .order('nama')
      .then(({ data }) => {
        const names = ((data as { nama: string }[]) ?? []).map((r) => r.nama);
        setKategori(names);
        setKategoriDipilih(names[0] ?? '');
      });
  }, []);

  if (!user) {
    return (
      <p className="text-stone-700">
        Membuat usulan butuh akun.{' '}
        <Link to="/login" className="font-medium underline">
          Masuk dulu
        </Link>
        .
      </p>
    );
  }

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesan('');
    const { data, error } = await supabase
      .from('proposals')
      .insert({
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        kategori: kategoriDipilih,
        lokasi: lokasi.trim() || null,
        latitude: lat,
        longitude: lng,
        estimasi_biaya: Number(estimasi) || 0,
        pengusul_id: user.id,
      })
      .select('id')
      .single();
    if (error) {
      setPesan(`Gagal menyimpan: ${error.message}`);
      return;
    }
    navigate(`/usulan/${(data as { id: number }).id}`);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Buat Usulan</h1>
      <form onSubmit={kirim} className="space-y-4">
        <div>
          <label htmlFor="judul" className="mb-1 block font-medium">
            Judul
          </label>
          <input
            id="judul"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="deskripsi" className="mb-1 block font-medium">
            Deskripsi
          </label>
          <textarea
            id="deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            required
            rows={4}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="kategori" className="mb-1 block font-medium">
            Kategori
          </label>
          <select
            id="kategori"
            value={kategoriDipilih}
            onChange={(e) => setKategoriDipilih(e.target.value)}
            className={inputClass}
          >
            {kategori.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lokasi" className="mb-1 block font-medium">
            Lokasi (teks)
          </label>
          <input
            id="lokasi"
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            placeholder="cth. Jl. Raya Bogor, Kramat Jati"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="estimasi" className="mb-1 block font-medium">
            Estimasi biaya (rupiah)
          </label>
          <input
            id="estimasi"
            type="number"
            min={0}
            value={estimasi}
            onChange={(e) => setEstimasi(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <span className="mb-1 block font-medium">Titik di peta (opsional, klik peta)</span>
          <MapContainer
            center={[-6.2088, 106.8456]}
            zoom={11}
            className="h-80 w-full rounded border border-stone-200"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PemilihLokasi
              onPilih={(la, ln) => {
                setLat(la);
                setLng(ln);
              }}
            />
            {lat !== null && lng !== null && <Marker position={[lat, lng]} />}
          </MapContainer>
          {lat !== null && lng !== null && (
            <p className="mt-1 text-sm text-stone-600">
              Dipilih: {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="rounded bg-emerald-800 px-5 py-2 font-medium text-white hover:bg-emerald-700"
        >
          Kirim Usulan
        </button>
        {pesan && <p className="text-sm text-red-700">{pesan}</p>}
      </form>
    </div>
  );
}
