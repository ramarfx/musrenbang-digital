import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMapEvents } from 'react-leaflet';
import { useAuth } from '../App';
import { JudulHalaman } from '../components/Halaman';
import { Kartu } from '../components/Kartu';
import { Marker, Peta, penandaHijau } from '../components/PetaUsulan';
import { Tombol } from '../components/Tombol';
import { ambilKategori, buatUsulan } from '../lib/data';
import { useMuat } from '../lib/useMuat';

function PemilihLokasi({ onPilih }: { onPilih: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPilih(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const kelasInput = 'w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5';
const kelasLabel = 'mb-1.5 block font-medium';

export default function BuatUsulan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: kategori } = useMuat(ambilKategori);
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [kategoriDipilih, setKategoriDipilih] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [estimasi, setEstimasi] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [pesan, setPesan] = useState('');

  if (!user) {
    return (
      <>
        <JudulHalaman judul="Buat usulan" />
        <p>
          Membuat usulan butuh akun.{' '}
          <Link to="/login" className="font-semibold text-warga underline">
            Masuk dulu
          </Link>
          .
        </p>
      </>
    );
  }

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesan('');
    const { error, id } = await buatUsulan({
      judul: judul.trim(),
      deskripsi: deskripsi.trim(),
      kategori: kategoriDipilih || kategori?.[0] || '',
      lokasi: lokasi.trim() || null,
      latitude: lat,
      longitude: lng,
      estimasi_biaya: Number(estimasi) || 0,
      pengusul_id: user.id,
    });
    if (error) {
      setPesan(`Gagal menyimpan: ${error}`);
      return;
    }
    navigate(`/usulan/${id}`);
  };

  return (
    <>
      <JudulHalaman
        judul="Buat usulan"
        sub="Usulkan satu program untuk lingkunganmu. Warga lain bisa mendukung dan mengomentarinya."
      />
      <Kartu className="max-w-2xl">
        <form onSubmit={kirim} className="flex flex-col gap-4">
          <div>
            <label htmlFor="judul" className={kelasLabel}>
              Judul
            </label>
            <input
              id="judul"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              required
              className={kelasInput}
            />
          </div>
          <div>
            <label htmlFor="deskripsi" className={kelasLabel}>
              Deskripsi
            </label>
            <textarea
              id="deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              required
              rows={4}
              className={kelasInput}
            />
          </div>
          <div>
            <label htmlFor="kategori" className={kelasLabel}>
              Program
            </label>
            <select
              id="kategori"
              value={kategoriDipilih || kategori?.[0] || ''}
              onChange={(e) => setKategoriDipilih(e.target.value)}
              className={kelasInput}
            >
              {(kategori ?? []).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lokasi" className={kelasLabel}>
              Lokasi
            </label>
            <input
              id="lokasi"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              placeholder="Nama jalan dan kelurahan"
              className={kelasInput}
            />
          </div>
          <div>
            <label htmlFor="estimasi" className={kelasLabel}>
              Estimasi biaya (rupiah)
            </label>
            <input
              id="estimasi"
              type="number"
              inputMode="numeric"
              min={0}
              value={estimasi}
              onChange={(e) => setEstimasi(e.target.value)}
              className={kelasInput}
            />
          </div>
          <div>
            <span className={kelasLabel}>Titik di peta (opsional, ketuk peta)</span>
            <Peta>
              <PemilihLokasi
                onPilih={(la, ln) => {
                  setLat(la);
                  setLng(ln);
                }}
              />
              {lat !== null && lng !== null && <Marker position={[lat, lng]} icon={penandaHijau} />}
            </Peta>
            {lat !== null && lng !== null && (
              <p className="mt-1.5 text-sm text-muted">
                Dipilih: {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            )}
          </div>
          <Tombol type="submit" varian="utama" className="self-start">
            Kirim usulan
          </Tombol>
          {pesan && (
            <p role="alert" className="text-sm text-mustard-tua">
              {pesan}
            </p>
          )}
        </form>
      </Kartu>
    </>
  );
}
