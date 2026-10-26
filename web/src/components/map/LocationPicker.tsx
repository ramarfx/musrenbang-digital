import '@/lib/leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

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
      className={`${className} w-full rounded-xl border border-stone-200`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onChange={onChange} />
      {latitude !== null && longitude !== null && <Marker position={[latitude, longitude]} />}
    </MapContainer>
  );
}
