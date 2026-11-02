import type { Proposal } from '@musrenbang/shared';
import { AttributionControl, MapContainer, Marker } from 'react-leaflet';
import { ATTRIBUTION_PREFIX, OPSI_PETA } from '@/lib/leaflet';
import { LapisanPeta } from './LapisanPeta';

type LokasiUsulanProps = {
  proposal: Pick<Proposal, 'judul' | 'lokasi' | 'latitude' | 'longitude'>;
};

/**
 * Peta kecil di halaman detail usulan (PRD FR-04). Usulan tanpa titik tidak menampilkan peta
 * dan menjelaskannya, bukan peta kosong di titik tebakan.
 */
export function LokasiUsulan({ proposal }: LokasiUsulanProps) {
  const { latitude, longitude, lokasi, judul } = proposal;
  const adaTitik = latitude !== null && longitude !== null;

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
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        {...OPSI_PETA}
        attributionControl={false}
        className="peta-hangat isolate h-60 w-full rounded-2xl border border-border"
      >
        <AttributionControl prefix={ATTRIBUTION_PREFIX} />
        <LapisanPeta />
        <Marker position={[latitude, longitude]} />
      </MapContainer>
      {lokasi && <p className="text-[13px] text-muted">{lokasi}</p>}
    </div>
  );
}
