import type { Proposal } from '@musrenbang/shared';
import L from 'leaflet';
import { useMemo, useState } from 'react';
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { getCategoryInfo } from '@/features/categories/info';
import { UpvoteButton } from '@/features/proposals/components/UpvoteButton';
import { buatIkonGugus, buatIkonKota, buatIkonPin, hitungTingkat } from '@/lib/penanda';
import {
  BATAS_JAKARTA_DARAT,
  WILAYAH_PILIHAN,
  hitungBatas,
  titikDiWilayah,
  type Wilayah,
} from '@/lib/wilayah';

type Titik = Proposal & { latitude: number; longitude: number };
type Gugus = { anggota: Titik[]; lat: number; lng: number };

/** Jarak layar (piksel) di bawah ini membuat dua pin digabung jadi satu gugus. */
const JARAK_GABUNG = 46;

/** Di bawah zoom ini pin menyatu per kota; di bawah `ZOOM_SATU` jadi satu ikon untuk Jakarta. */
const ZOOM_KOTA = 10.5;
const ZOOM_SATU = 9;

/** Pada zoom sedekat ini semua pin tampil sendiri-sendiri, supaya gugus tidak pernah buntu. */
const ZOOM_PISAH = 17;

/**
 * Menggabungkan titik yang berdekatan di layar. Jaraknya dihitung dari proyeksi pada zoom saat
 * ini, jadi makin jauh peta di-zoom out, makin banyak titik yang bertemu dan menyatu, sampai
 * akhirnya semuanya satu gugus. Cukup dihitung ulang saat zoom berubah, bukan saat peta digeser.
 */
function kelompokkan(map: L.Map, titik: Titik[], zoom: number): Gugus[] {
  if (zoom >= ZOOM_PISAH) {
    return titik.map((item) => ({ anggota: [item], lat: item.latitude, lng: item.longitude }));
  }
  const kelompok: { x: number; y: number; anggota: Titik[] }[] = [];
  for (const item of titik) {
    const posisi = map.project([item.latitude, item.longitude], zoom);
    const dekat = kelompok.find(
      (satu) => Math.hypot(satu.x - posisi.x, satu.y - posisi.y) < JARAK_GABUNG,
    );
    if (dekat) {
      const n = dekat.anggota.length;
      dekat.x = (dekat.x * n + posisi.x) / (n + 1);
      dekat.y = (dekat.y * n + posisi.y) / (n + 1);
      dekat.anggota.push(item);
    } else {
      kelompok.push({ x: posisi.x, y: posisi.y, anggota: [item] });
    }
  }
  return kelompok.map((satu) => {
    const lat = satu.anggota.reduce((jumlah, item) => jumlah + item.latitude, 0);
    const lng = satu.anggota.reduce((jumlah, item) => jumlah + item.longitude, 0);
    return {
      anggota: satu.anggota,
      lat: lat / satu.anggota.length,
      lng: lng / satu.anggota.length,
    };
  });
}

/**
 * Pin usulan di peta, tiga tingkat menurut zoom. Dekat: pin per usulan, dan yang berdekatan
 * menyatu jadi lingkaran berangka. Menengah: satu ikon per kota administrasi. Jauh: satu ikon
 * untuk seluruh Jakarta. Menekan gugus atau ikon kota memperbesar peta ke anggotanya.
 */
export function LapisanPin({ titik }: { titik: Titik[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const suaraTerbanyak = Math.max(0, ...titik.map((item) => item.jumlah_suara));
  const perKota = useMemo(() => kelompokkanPerKota(titik), [titik]);
  const kelompok = useMemo(() => kelompokkan(map, titik, zoom), [map, titik, zoom]);

  if (titik.length > 0 && zoom < ZOOM_SATU) {
    return (
      <PinKota
        kunci="semua"
        nama="DKI Jakarta"
        warna="#047857"
        anggota={titik}
        tunda={0}
        batas={BATAS_JAKARTA_DARAT}
      />
    );
  }

  if (zoom < ZOOM_KOTA && perKota.length > 0) {
    return (
      <>
        {perKota.map(({ wilayah, anggota }, urutan) => (
          <PinKota
            key={wilayah.kode}
            kunci={wilayah.kode}
            nama={wilayah.nama}
            warna={wilayah.warna}
            anggota={anggota}
            tunda={urutan * 60}
            batas={hitungBatas(wilayah.geometri)}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {kelompok.map((gugus, urutan) => {
        const tunda = Math.min(urutan * 35, 350);
        const pertama = gugus.anggota[0];
        if (!pertama) return null;
        return gugus.anggota.length === 1 ? (
          <PinUsulan
            key={pertama.id}
            proposal={pertama}
            tunda={tunda}
            suaraTerbanyak={suaraTerbanyak}
          />
        ) : (
          <PinGugus key={`${pertama.id}+${gugus.anggota.length}`} gugus={gugus} tunda={tunda} />
        );
      })}
    </>
  );
}

/**
 * Mengelompokkan titik ke kota administrasi tempatnya berada. Titik yang jatuh di luar semua
 * batas kota (mis. salah taruh di peta) tidak ikut, dan baru terlihat saat peta di-zoom dekat.
 */
function kelompokkanPerKota(titik: Titik[]): { wilayah: Wilayah; anggota: Titik[] }[] {
  const hasil: { wilayah: Wilayah; anggota: Titik[] }[] = [];
  for (const wilayah of WILAYAH_PILIHAN) {
    const anggota = titik.filter((item) =>
      titikDiWilayah(wilayah.geometri, item.latitude, item.longitude),
    );
    if (anggota.length > 0) hasil.push({ wilayah, anggota });
  }
  return hasil;
}

function PinKota({
  kunci,
  nama,
  warna,
  anggota,
  tunda,
  batas,
}: {
  kunci: string;
  nama: string;
  warna: string;
  anggota: Titik[];
  tunda: number;
  batas: [[number, number], [number, number]];
}) {
  const map = useMap();
  const jumlah = anggota.length;
  const ikon = useMemo(
    () => buatIkonKota(nama, jumlah, warna, tunda),
    [nama, jumlah, warna, tunda],
  );
  const lat = anggota.reduce((total, item) => total + item.latitude, 0) / jumlah;
  const lng = anggota.reduce((total, item) => total + item.longitude, 0) / jumlah;
  return (
    <Marker
      key={kunci}
      position={[lat, lng]}
      icon={ikon}
      zIndexOffset={jumlah}
      eventHandlers={{
        click: () => map.flyToBounds(batas, { padding: [40, 40], duration: 0.8 }),
      }}
    />
  );
}

function PinGugus({ gugus, tunda }: { gugus: Gugus; tunda: number }) {
  const map = useMap();
  const jumlah = gugus.anggota.length;
  const ikon = useMemo(() => buatIkonGugus(jumlah, tunda), [jumlah, tunda]);
  return (
    <Marker
      position={[gugus.lat, gugus.lng]}
      icon={ikon}
      zIndexOffset={jumlah}
      eventHandlers={{
        click: () => {
          const batas = L.latLngBounds(
            gugus.anggota.map((item) => [item.latitude, item.longitude] as [number, number]),
          );
          map.flyToBounds(batas, { padding: [70, 70], maxZoom: ZOOM_PISAH, duration: 0.7 });
        },
      }}
    />
  );
}

function PinUsulan({
  proposal,
  tunda,
  suaraTerbanyak,
}: {
  proposal: Titik;
  tunda: number;
  suaraTerbanyak: number;
}) {
  const tingkat = hitungTingkat(proposal.jumlah_suara, suaraTerbanyak);
  const ikon = useMemo(
    () => buatIkonPin(proposal.kategori, tingkat, tunda),
    [proposal.kategori, tingkat, tunda],
  );
  return (
    <Marker
      position={[proposal.latitude, proposal.longitude]}
      icon={ikon}
      zIndexOffset={proposal.jumlah_suara}
    >
      <Popup className="popup-usulan" minWidth={236} maxWidth={260}>
        <div className="flex items-center gap-2 pr-6 text-xs leading-tight font-medium text-muted">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="flex-none"
          >
            <path d={getCategoryInfo(proposal.kategori).ikon} />
          </svg>
          {proposal.kategori}
        </div>
        <p className="line-clamp-2 !mt-2 !mb-4 text-[15px] leading-snug font-bold [overflow-wrap:anywhere] text-ink">
          {proposal.judul}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} />
            <Link
              to={`/usulan/${proposal.id}#komentar`}
              aria-label="Lihat komentar"
              title="Komentar"
              className="grid size-9 place-items-center rounded-xl border border-border bg-surface !text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
            >
              <Icon name="usulan" size={16} />
            </Link>
          </div>
          <Link
            to={`/usulan/${proposal.id}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold !text-ink underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
          >
            Lihat
            <span className="rotate-180">
              <Icon name="kembali" size={14} />
            </span>
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}
