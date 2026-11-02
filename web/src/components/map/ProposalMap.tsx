import type { Proposal } from '@musrenbang/shared';
import { ATTRIBUTION_PREFIX, OPSI_PETA } from '@/lib/leaflet';
import type { KodeWilayah } from '@/lib/wilayah';
import { LapisanPeta } from './LapisanPeta';
import { LapisanWilayah } from './LapisanWilayah';
import { Link } from 'react-router-dom';
import { AttributionControl, MapContainer, Marker, Popup } from 'react-leaflet';

type ProposalMapProps = {
  proposals: Proposal[];
  className?: string;
  /** Wilayah yang diarsir dan dituju peta; null berarti tampilan Jakarta penuh. */
  wilayah?: KodeWilayah | null;
};

const JAKARTA_CENTER: [number, number] = [-6.2088, 106.8456];

export function ProposalMap({ proposals, className = 'h-96', wilayah = null }: ProposalMapProps) {
  const denganLokasi = proposals.filter(
    (proposal): proposal is Proposal & { latitude: number; longitude: number } =>
      proposal.latitude !== null && proposal.longitude !== null,
  );

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
      {denganLokasi.map((proposal) => (
        <Marker key={proposal.id} position={[proposal.latitude, proposal.longitude]}>
          <Popup>
            <Link to={`/usulan/${proposal.id}`} className="font-medium text-emerald-800">
              {proposal.judul}
            </Link>
            <div className="text-xs text-stone-600">
              {proposal.kategori} · {proposal.jumlah_suara} suara
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
