import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/*
 * Ilustrasi toa: suara warga yang dikeraskan sampai terdengar ke anggaran kota. Simbol di
 * sekitarnya adalah empat hal yang benar-benar ada di aplikasi: titik lokasi usulan, upvote,
 * usulan tertulis, dan perbandingan dengan APBD. Semua warna memakai token tema, jadi
 * gambar ikut berubah di mode gelap tanpa versi kedua.
 *
 * Saat kursor menyentuh gambar (lihat .toa di index.css): lintasan berputar dan lencana
 * bergeser mengelilingi toa (orbit), sementara toa menyentak dan gelombang ketiga muncul
 * (teriak). Bagian yang bergerak dibungkus <g> tersendiri supaya tidak bertabrakan dengan
 * animasi masuk.
 */

const TINTA = 'var(--ink)';
const KERTAS = 'var(--surface)';
const STABILO = 'var(--hijau-terang)';
const GELAP = 'var(--hitam)';

/** Lencana bulat berisi ikon garis 24px di titik (x, y); geser = arah gerak saat disentuh. */
function Lencana({
  x,
  y,
  isi,
  latar,
  ikon,
  geser,
  penuh = false,
}: {
  x: number;
  y: number;
  isi: string;
  latar: string;
  ikon: string;
  geser: [number, number];
  penuh?: boolean;
}) {
  return (
    <g
      className="toa-geser"
      style={{ '--gx': `${geser[0]}px`, '--gy': `${geser[1]}px` } as CSSProperties}
    >
      <g className="toa-lencana">
        <circle cx={x} cy={y} r={27} fill={latar} stroke={TINTA} strokeWidth={3} />
        <g transform={`translate(${x - 12} ${y - 12})`}>
          <path
            d={ikon}
            fill={penuh ? isi : 'none'}
            stroke={isi}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </g>
  );
}

/** Satu busur gelombang suara; dibungkus supaya geser saat disentuh terpisah dari animasi masuk. */
function Gelombang({ d, className, ke = '' }: { d: string; className?: string; ke?: string }) {
  return (
    <g className={cn('toa-suara', ke)}>
      <path className={className} d={d} stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}

export function Toa({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 400"
      aria-hidden="true"
      className={cn('toa h-auto w-full', className)}
      fill="none"
    >
      {/* Orbit di belakang toa: jangkauan suara warga. */}
      <g className="toa-orbit toa-orbit-1">
        <ellipse
          cx={250}
          cy={205}
          rx={205}
          ry={72}
          transform="rotate(-16 250 205)"
          stroke={TINTA}
          strokeWidth={2}
        />
      </g>
      <g className="toa-orbit toa-orbit-2">
        <ellipse
          cx={245}
          cy={210}
          rx={178}
          ry={104}
          transform="rotate(14 245 210)"
          stroke={TINTA}
          strokeWidth={1.5}
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
      </g>

      <g transform="rotate(-18 250 200)">
        {/* Gelombang suara keluar dari corong; yang ketiga hanya muncul saat disentuh. */}
        <Gelombang className="toa-gelombang" d="M378 166 Q394 200 378 234" />
        <Gelombang className="toa-gelombang toa-gelombang-2" d="M402 146 Q428 200 402 254" />
        <Gelombang ke="toa-suara-3" d="M426 126 Q462 200 426 274" />

        {/* Badan toa. */}
        <g className="toa-badan">
          <rect
            x={128}
            y={176}
            width={30}
            height={48}
            rx={8}
            fill={KERTAS}
            stroke={TINTA}
            strokeWidth={4}
          />
          <rect x={156} y={184} width={32} height={32} fill={TINTA} />
          <path
            d="M188 184 L330 118 L330 282 L188 216 Z"
            fill={KERTAS}
            stroke={TINTA}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <path
            d="M252 154 L282 140 L282 260 L252 246 Z"
            fill={STABILO}
            stroke={TINTA}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <ellipse
            cx={330}
            cy={200}
            rx={24}
            ry={82}
            fill={STABILO}
            stroke={TINTA}
            strokeWidth={4}
          />
          <ellipse cx={336} cy={200} rx={12} ry={62} fill={GELAP} />
          {/* Gagang. */}
          <path
            d="M204 214 L194 272 Q192 284 204 284 L214 284 Q224 284 224 274 L228 222 Z"
            fill={TINTA}
          />
        </g>
      </g>

      <Lencana
        // Digeser murni ke kiri menjauhi gelombang dan elips orbit di kanan, tanpa naik.
        x={360}
        y={66}
        isi={GELAP}
        latar={STABILO}
        geser={[-26, 0]}
        ikon="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      />
      <Lencana
        x={92}
        y={96}
        isi={KERTAS}
        latar={TINTA}
        geser={[24, -14]}
        ikon="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"
      />
      <Lencana
        x={446}
        y={262}
        isi={KERTAS}
        latar={TINTA}
        geser={[-10, 28]}
        ikon="M12 3.5 3.5 13H9v7.5h6V13h5.5L12 3.5Z"
        penuh
      />
      <Lencana
        x={286}
        y={350}
        isi={GELAP}
        latar={STABILO}
        geser={[30, -8]}
        ikon="M4 20V10M10 20V4M16 20v-7M22 20H2"
      />

      <circle cx={58} cy={250} r={7} fill={TINTA} />
      <circle cx={176} cy={338} r={6} fill={STABILO} stroke={TINTA} strokeWidth={2.5} />
      <circle cx={452} cy={128} r={5} fill={TINTA} />
    </svg>
  );
}
