import { ATTRIBUTION_PREFIX } from '@/lib/leaflet';
import { AttributionControl, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  className?: string;
};

const JAKARTA_CENTER: [number, number] = [-6.2088, 106.8456];

function ClickHandler({ onChange }: { onChange: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  className = 'h-80',
}: LocationPickerProps) {
  return (
    <MapContainer
      center={JAKARTA_CENTER}
      zoom={11}
      scrollWheelZoom={false}
      attributionControl={false}
      className={`peta-hangat ${className} isolate w-full rounded-3xl border border-border`}
    >
      <AttributionControl prefix={ATTRIBUTION_PREFIX} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onChange={onChange} />
      {latitude !== null && longitude !== null && <Marker position={[latitude, longitude]} />}
    </MapContainer>
  );
}
