import type { Proposal } from '@musrenbang/shared';
import { ATTRIBUTION_PREFIX } from '@/lib/leaflet';
import { Link } from 'react-router-dom';
import { AttributionControl, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

type ProposalMapProps = {
  proposals: Proposal[];
  className?: string;
};

const JAKARTA_CENTER: [number, number] = [-6.2088, 106.8456];

export function ProposalMap({ proposals, className = 'h-96' }: ProposalMapProps) {
  const denganLokasi = proposals.filter(
    (proposal): proposal is Proposal & { latitude: number; longitude: number } =>
      proposal.latitude !== null && proposal.longitude !== null,
  );

  return (
    <MapContainer
      center={JAKARTA_CENTER}
      zoom={11}
      scrollWheelZoom={false}
      attributionControl={false}
      className={`peta-hangat ${className} w-full rounded-2xl border border-border`}
    >
      <AttributionControl prefix={ATTRIBUTION_PREFIX} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
