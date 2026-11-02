import type { Proposal } from '@musrenbang/shared';
import { useMemo } from 'react';
import { AttributionControl, MapContainer, Marker, useMap } from 'react-leaflet';
import { Icon } from '@/components/ui/Icon';
import { ATTRIBUTION_PREFIX, OPSI_PETA } from '@/lib/leaflet';
import { buatIkonPin } from '@/lib/penanda';
import { wilayahDariTitik, type Wilayah } from '@/lib/wilayah';
import { LapisanPeta } from './LapisanPeta';
import { LapisanWilayah } from './LapisanWilayah';

type LokasiUsulanProps = {
  proposal: Pick<Proposal, 'judul' | 'lokasi' | 'latitude' | 'longitude' | 'kategori'>;
};

/**
 * Peta kecil di halaman detail usulan (PRD FR-04). Peta dibuka pada seluruh kota administrasi
 * tempat titiknya berada, dengan kotanya diarsir dan namanya tertulis di bawah peta, supaya
 * jelas usulan ini ada di wilayah mana. Tombol "Dekatkan ke titik" memperbesar ke lokasinya.
 * Usulan tanpa titik tidak menampilkan peta dan menjelaskannya, bukan peta kosong di titik
 * tebakan.
 */
export function LokasiUsulan({ proposal }: LokasiUsulanProps) {
  const { latitude, longitude, lokasi, judul, kategori } = proposal;
  const adaTitik = latitude !== null && longitude !== null;

  const wilayah = useMemo(
    () => (adaTitik ? wilayahDariTitik(latitude, longitude) : undefined),
    [adaTitik, latitude, longitude],
  );
  const ikon = useMemo(() => buatIkonPin(kategori, null, 0), [kategori]);

  if (!adaTitik) {
    return (
      <p className="rounded-2xl bg-active px-4 py-3 text-sm text-muted">
        {lokasi ? `${lokasi}. ` : ''}
        Usulan ini tidak punya titik lokasi di peta, jadi hanya tampil di daftar.
      </p>
    );
  }

  return (
    <div className="space-y-2" role="region" aria-label={`Peta lokasi usulan ${judul}`}>
      <div className="relative">
        <MapContainer
          center={[latitude, longitude]}
          zoom={wilayah ? 11 : 15}
          {...OPSI_PETA}
          attributionControl={false}
          className="peta-hangat isolate h-72 w-full rounded-2xl border border-border"
        >
          <AttributionControl prefix={ATTRIBUTION_PREFIX} />
          <LapisanPeta />
          {wilayah && <LapisanWilayah kode={wilayah.kode} />}
          <Marker position={[latitude, longitude]} icon={ikon} />
          <TombolDekatkan titik={[latitude, longitude]} />
        </MapContainer>
      </div>
      <KeteranganWilayah wilayah={wilayah} />
    </div>
  );
}

/** Nama kota tempat titik berada, dengan titik warna yang sama dengan arsiran di peta. */
export function KeteranganWilayah({ wilayah }: { wilayah: Wilayah | undefined }) {
  return wilayah ? (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
      <span
        aria-hidden="true"
        className="size-2.5 flex-none rounded-full ring-1 ring-black/15"
        style={{ backgroundColor: wilayah.warna }}
      />
      Di {wilayah.nama}
    </span>
  ) : (
    <span className="text-[13px] text-muted">
      Titik ini di luar batas kota administrasi Jakarta.
    </span>
  );
}

/** Tombol di atas peta: terbang dekat ke titik usulan setelah melihat seluruh kotanya. */
function TombolDekatkan({ titik }: { titik: [number, number] }) {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control !m-3 !border-0">
        <button
          type="button"
          onClick={() => map.flyTo(titik, 16, { duration: 0.8 })}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-ink shadow-sm transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
        >
          <Icon name="sasaran" size={15} />
          Dekatkan ke titik
        </button>
      </div>
    </div>
  );
}
