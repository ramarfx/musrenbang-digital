import type { Proposal } from '@musrenbang/shared';
import { ATTRIBUTION_PREFIX, OPSI_PETA } from '@/lib/leaflet';
import { BATAS_JAKARTA_DARAT, cariWilayah, hitungBatas, type PilihanWilayah } from '@/lib/wilayah';
import { LapisanPeta } from './LapisanPeta';
import { LapisanPin } from './LapisanPin';
import { LapisanWilayah } from './LapisanWilayah';
import { TombolKembaliPeta } from './TombolKembaliPeta';
import { AttributionControl, MapContainer } from 'react-leaflet';

type ProposalMapProps = {
  proposals: Proposal[];
  className?: string;
  /** Wilayah yang diarsir dan dituju peta; null seluruh Jakarta, 'tanpa' tidak mengarsir. */
  wilayah?: PilihanWilayah;
};

const JAKARTA_CENTER: [number, number] = [-6.2088, 106.8456];

export function ProposalMap({ proposals, className = 'h-96', wilayah = null }: ProposalMapProps) {
  const denganLokasi = proposals.filter(
    (proposal): proposal is Proposal & { latitude: number; longitude: number } =>
      proposal.latitude !== null && proposal.longitude !== null,
  );

  // Tampilan awal: wilayah yang dipilih, atau seluruh Jakarta daratan, sama dengan tujuan terbang.
  const pilihan = wilayah === null || wilayah === 'tanpa' ? undefined : cariWilayah(wilayah);
  const batasAwal = pilihan ? hitungBatas(pilihan.geometri) : BATAS_JAKARTA_DARAT;

  return (
    <MapContainer
      center={JAKARTA_CENTER}
      zoom={11}
      {...OPSI_PETA}
      attributionControl={false}
      className={`peta-hangat ${className} isolate w-full rounded-3xl border border-border`}
    >
      <AttributionControl prefix={ATTRIBUTION_PREFIX} />
      <LapisanPeta />
      <LapisanWilayah kode={wilayah} />
      <LapisanPin titik={denganLokasi} />
      <TombolKembaliPeta tujuan={{ batas: batasAwal }} />
    </MapContainer>
  );
}
