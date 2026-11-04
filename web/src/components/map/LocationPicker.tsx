import { useEffect, useMemo, useRef, useState } from 'react';
import { AttributionControl, MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { cariTempat, type HasilCari } from '@/lib/geocode';
import { ATTRIBUTION_PREFIX, OPSI_PETA } from '@/lib/leaflet';
import { buatIkonPin } from '@/lib/penanda';
import { BATAS_JAKARTA_DARAT, dalamJakarta } from '@/lib/wilayah';
import { BatasJakartaPeta } from './BatasJakartaPeta';
import { LapisanPeta } from './LapisanPeta';
import { TombolKembaliPeta } from './TombolKembaliPeta';
import { cn } from '@/lib/cn';

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  /** `nama` terisi bila titik dipilih dari hasil cari (nama singkat tempatnya). */
  onChange: (latitude: number, longitude: number, nama?: string) => void;
  /** Bila diisi, peta menampilkan tombol untuk menghapus tanda yang sudah dipasang. */
  onHapus?: () => void;
  /** Kategori usulan; ikon pin di peta mengikutinya dan berganti saat kategori diganti. */
  kategori?: string;
  className?: string;
};

const JAKARTA_CENTER: [number, number] = [-6.2088, 106.8456];
const ZOOM_TEMPAT = 16;

const tombolIkon =
  'inline-flex size-11 flex-none items-center justify-center rounded-xl border border-edge bg-surface text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.92] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga';

/** Titik klik di dalam peta (piksel dari pojok kiri atas) dan lebar peta, untuk menaruh notifikasi. */
type TitikKlik = { x: number; y: number; lebar: number };

function ClickHandler({
  onChange,
}: {
  onChange: (latitude: number, longitude: number, titik: TitikKlik) => unknown;
}) {
  const map = useMap();
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng, {
        x: event.containerPoint.x,
        y: event.containerPoint.y,
        lebar: map.getSize().x,
      });
    },
  });
  return null;
}

/** Terbang halus ke titik tujuan tiap kali `tujuan` berganti (hasil cari atau lokasi saya). */
function Terbang({ tujuan }: { tujuan: { lat: number; lng: number; id: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!tujuan) return;
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo([tujuan.lat, tujuan.lng], ZOOM_TEMPAT, { animate: !kurangiGerak, duration: 0.9 });
  }, [map, tujuan]);
  return null;
}

/**
 * Pemilih titik di peta: klik peta, cari daerah lewat kotak cari, atau pakai lokasi saat ini.
 * Kotak cari ini tidak berada di dalam <form> karena komponen ini dipakai di dalam formulir
 * usulan; Enter menjalankan pencarian lewat onKeyDown.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
  onHapus,
  kategori = '',
  className = 'h-80',
}: LocationPickerProps) {
  const ikonPin = useMemo(() => buatIkonPin(kategori, null, 0), [kategori]);
  const [kata, setKata] = useState('');
  const [hasil, setHasil] = useState<HasilCari[]>([]);
  const [mencari, setMencari] = useState(false);
  const [mencariPosisi, setMencariPosisi] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [tujuan, setTujuan] = useState<{ lat: number; lng: number; id: number } | null>(null);
  const [salahPencet, setSalahPencet] = useState<(TitikKlik & { id: number }) | null>(null);
  const permintaan = useRef<AbortController | null>(null);
  const punyaTitik = latitude !== null && longitude !== null;

  useEffect(() => () => permintaan.current?.abort(), []);

  // Notifikasi salah pencet hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!salahPencet) return;
    const waktu = window.setTimeout(() => setSalahPencet(null), 3000);
    return () => window.clearTimeout(waktu);
  }, [salahPencet]);

  /** Satu-satunya jalan titik masuk: titik di luar Jakarta ditolak dengan penjelasan. */
  const terima = (lat: number, lng: number, nama?: string, titik?: TitikKlik): boolean => {
    if (!dalamJakarta(lat, lng)) {
      // Klik di peta: kabarnya muncul di dekat kursor. Cara lain (cari, lokasiku): teks di atas peta.
      if (titik) setSalahPencet({ ...titik, id: Date.now() });
      else setPesan('Titik harus ada di wilayah DKI Jakarta, di dalam garis hijau putus-putus.');
      return false;
    }
    setPesan(null);
    setSalahPencet(null);
    onChange(lat, lng, nama);
    return true;
  };

  const pilih = (lat: number, lng: number, nama?: string) => {
    if (terima(lat, lng, nama)) setTujuan({ lat, lng, id: Date.now() });
  };

  const cari = async () => {
    if (kata.trim().length < 3) {
      setPesan('Ketik minimal 3 huruf, misalnya nama kelurahan atau jalan.');
      setHasil([]);
      return;
    }
    permintaan.current?.abort();
    const kontrol = new AbortController();
    permintaan.current = kontrol;
    setMencari(true);
    setPesan(null);
    try {
      const data = await cariTempat(kata, kontrol.signal);
      setHasil(data);
      if (data.length === 0) setPesan('Tempat itu tidak ketemu. Coba nama yang lebih umum.');
    } catch (error) {
      if (kontrol.signal.aborted) return;
      setHasil([]);
      setPesan(error instanceof Error ? error.message : 'Pencarian gagal.');
    } finally {
      if (!kontrol.signal.aborted) setMencari(false);
    }
  };

  const lokasiSaya = () => {
    if (!('geolocation' in navigator)) {
      setPesan('Peramban ini tidak bisa membaca lokasi. Cari lewat kotak cari atau klik peta.');
      return;
    }
    setMencariPosisi(true);
    setPesan(null);
    setHasil([]);
    navigator.geolocation.getCurrentPosition(
      (posisi) => {
        setMencariPosisi(false);
        pilih(posisi.coords.latitude, posisi.coords.longitude);
      },
      (galat) => {
        setMencariPosisi(false);
        setPesan(
          galat.code === galat.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Izinkan di pengaturan peramban, atau cari lewat kotak cari.'
            : 'Lokasimu belum terbaca. Coba lagi, atau klik langsung di peta.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };

  return (
    <div className="space-y-2.5">
      <div role="search" className="flex gap-2">
        <Input
          type="search"
          aria-label="Cari daerah, jalan, atau tempat"
          placeholder="Cari daerah, jalan, atau tempat"
          value={kata}
          maxLength={120}
          onChange={(event) => setKata(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void cari();
            }
          }}
        />
        <button
          type="button"
          aria-label="Cari di peta"
          title="Cari"
          onClick={() => void cari()}
          disabled={mencari}
          className={tombolIkon}
        >
          {mencari ? <Spinner label="Mencari" /> : <Icon name="cari" size={20} />}
        </button>
        <button
          type="button"
          aria-label="Pakai lokasiku sekarang"
          title="Lokasiku sekarang"
          onClick={lokasiSaya}
          disabled={mencariPosisi}
          className={cn(tombolIkon, 'group/lokasi')}
        >
          {mencariPosisi ? (
            <Spinner label="Membaca lokasi" />
          ) : (
            <span className="transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/lokasi:rotate-90 motion-reduce:transition-none">
              <Icon name="sasaran" size={20} />
            </span>
          )}
        </button>
      </div>

      {pesan && (
        <p role="status" className="text-[13px] text-muted">
          {pesan}
        </p>
      )}

      {hasil.length > 0 && (
        <ul className="stagger grid gap-1 rounded-2xl border border-border bg-surface p-1.5">
          {hasil.map((item) => (
            <li key={`${item.lat},${item.lng}`}>
              <button
                type="button"
                onClick={() => {
                  pilih(item.lat, item.lng, item.singkat);
                  setHasil([]);
                  setKata(item.singkat);
                }}
                className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-150 hover:bg-active focus-visible:outline-2 focus-visible:outline-warga"
              >
                <span className="mt-0.5 text-warga">
                  <Icon name="lokasi" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {item.singkat}
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">{item.nama}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <MapContainer
          center={punyaTitik ? [latitude, longitude] : JAKARTA_CENTER}
          zoom={punyaTitik ? ZOOM_TEMPAT : 11}
          {...OPSI_PETA}
          attributionControl={false}
          className={`peta-hangat ${className} isolate w-full rounded-3xl border border-border`}
        >
          <AttributionControl prefix={ATTRIBUTION_PREFIX} />
          <LapisanPeta />
          <BatasJakartaPeta />
          <ClickHandler onChange={(lat, lng, titik) => terima(lat, lng, undefined, titik)} />
          <Terbang tujuan={tujuan} />
          <TombolKembaliPeta
            tujuan={
              punyaTitik
                ? { pusat: [latitude, longitude], zoom: ZOOM_TEMPAT }
                : { batas: BATAS_JAKARTA_DARAT }
            }
          />
          {punyaTitik && <Marker position={[latitude, longitude]} icon={ikonPin} />}
        </MapContainer>
        {punyaTitik && onHapus && (
          <button
            type="button"
            onClick={() => {
              setSalahPencet(null);
              onHapus();
            }}
            className="absolute bottom-7 left-3 z-[500] inline-flex h-9 items-center gap-1.5 rounded-xl border-[1.5px] border-edge bg-surface px-3 text-[13px] font-bold text-ink shadow-sm transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
          >
            <Icon name="sampah" size={16} />
            Hapus tanda
          </button>
        )}
        {salahPencet && (
          <p
            key={salahPencet.id}
            role="status"
            style={{
              left: Math.min(Math.max(salahPencet.x, 110), salahPencet.lebar - 110),
              top: Math.max(salahPencet.y, 56),
            }}
            className="tanda-salah pointer-events-none absolute z-[1000] w-52 rounded-xl bg-ink px-3 py-2 text-center text-[12.5px] leading-snug font-semibold text-on-ink"
          >
            Di luar Jakarta. Pilih titik di dalam garis hijau.
          </p>
        )}
      </div>
    </div>
  );
}
