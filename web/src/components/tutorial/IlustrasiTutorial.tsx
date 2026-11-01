import type { CSSProperties } from 'react';

// Gaya sama dengan toa di landing: garis tinta tebal, isian kertas dan stabilo. Warna dari
// token tema, jadi ilustrasi ikut berubah di mode gelap. Gerak ada di kelas `tt-*` (index.css).
const TINTA = 'var(--ink)';
const KERTAS = 'var(--surface)';
const STABILO = 'var(--hijau-terang)';
const GELAP = 'var(--hitam)';

const jeda = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

// Detik amplop melewati tiap tahap; harus cocok dengan kurva dan durasi `tt-amplop`.
const TAHAP = [
  { x: 50, nama: 'Kelurahan', bulan: 'Jan', lewat: 300, ikon: 'M3 11l9-7 9 7v9H3zM9 20v-5h6v5' },
  {
    x: 150,
    nama: 'Kecamatan',
    bulan: 'Feb',
    lewat: 1250,
    ikon: 'M4 20V9l8-5 8 5v11M3 20h18M9 20v-4h6v4M9 11h.01M15 11h.01',
  },
  {
    x: 250,
    nama: 'Kota',
    bulan: 'Mar',
    lewat: 1770,
    ikon: 'M3 20h18M4 9h16M12 3l8 6H4zM6 9v11M10 9v11M14 9v11M18 9v11',
  },
] as const;

/** Amplop meluncur di jalur Kelurahan sampai APBD; tiap tahap beriak saat dilewati. */
export function JalurMusrenbang() {
  return (
    <svg
      viewBox="0 0 400 210"
      className="h-auto w-full max-w-[520px]"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x={50}
        y={102}
        width={300}
        height={16}
        rx={8}
        fill={KERTAS}
        stroke={TINTA}
        strokeWidth={3}
      />
      <rect x={52} y={104} width={296} height={12} rx={6} fill={STABILO} className="tt-jejak" />
      {TAHAP.map((tahap) => (
        <circle
          key={`riak-${tahap.x}`}
          className="tt-riak"
          style={jeda(tahap.lewat)}
          cx={tahap.x}
          cy={110}
          r={24}
          stroke={TINTA}
          strokeWidth={2}
        />
      ))}
      <circle
        className="tt-riak"
        style={jeda(2750)}
        cx={350}
        cy={110}
        r={24}
        stroke={STABILO}
        strokeWidth={4}
      />
      <circle
        className="tt-riak"
        style={jeda(2900)}
        cx={350}
        cy={110}
        r={24}
        stroke={TINTA}
        strokeWidth={2}
      />
      {TAHAP.map((tahap, index) => {
        const ikon = (warna: string) => (
          <path
            transform={`translate(${tahap.x - 12} 98)`}
            d={tahap.ikon}
            stroke={warna}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
        return index === 0 ? (
          <g key={tahap.x}>
            <circle cx={tahap.x} cy={110} r={24} fill={STABILO} stroke={TINTA} strokeWidth={3} />
            {ikon(GELAP)}
          </g>
        ) : (
          <g key={tahap.x}>
            <circle cx={tahap.x} cy={110} r={24} fill={KERTAS} stroke={TINTA} strokeWidth={3} />
            {ikon(TINTA)}
            {/* Ikon digambar ulang gelap di atas stabilo supaya tetap terbaca di kedua mode. */}
            <g className="tt-nyala" style={jeda(tahap.lewat)}>
              <circle cx={tahap.x} cy={110} r={24} fill={STABILO} stroke={TINTA} strokeWidth={3} />
              {ikon(GELAP)}
            </g>
          </g>
        );
      })}
      <circle cx={350} cy={110} r={24} fill={GELAP} stroke={GELAP} strokeWidth={3} />
      <path
        transform="translate(338 98)"
        d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="tt-amplop">
        <g className="tt-masuk">
          <g transform="translate(31 96.5)">
            <rect width={38} height={27} rx={3} fill={KERTAS} stroke={TINTA} strokeWidth={3} />
            <path d="M2 3l17 12 17-12" stroke={TINTA} strokeWidth={2.5} strokeLinejoin="round" />
            <rect
              x={25}
              y={16}
              width={9}
              height={8}
              fill={STABILO}
              stroke={TINTA}
              strokeWidth={1.5}
            />
            <path
              d="M5 20h12M5 23.5h8"
              stroke={TINTA}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.5}
            />
          </g>
        </g>
      </g>
      <g className="tt-nyala" style={jeda(2850)}>
        <circle cx={350} cy={110} r={24} fill={STABILO} stroke={TINTA} strokeWidth={3} />
        <path
          d="M340 110.5l7 7 14-14"
          stroke={GELAP}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g fontSize={13} fill={TINTA} textAnchor="middle">
        {TAHAP.map((tahap) => (
          <text key={tahap.x} x={tahap.x} y={164}>
            {tahap.nama}
          </text>
        ))}
        <text x={350} y={164}>
          APBD
        </text>
      </g>
      <g fontSize={12} fill="var(--muted)" textAnchor="middle">
        {TAHAP.map((tahap) => (
          <text key={tahap.x} x={tahap.x} y={182}>
            {tahap.bulan}
          </text>
        ))}
        <text x={350} y={182}>
          Des
        </text>
      </g>
      <g className="tt-nyala" style={jeda(3050)}>
        <rect x={300} y={26} width={88} height={26} rx={13} fill={GELAP} />
        <text x={344} y={43} fontSize={12} fill="#fff" textAnchor="middle">
          Masuk APBD
        </text>
      </g>
      <circle cx={24} cy={36} r={5} fill={TINTA} />
      <circle cx={196} cy={40} r={5} fill={STABILO} stroke={TINTA} strokeWidth={2} />
    </svg>
  );
}

/** Kota dengan tiga lencana langkah yang muncul bergantian; penutup tutorial. */
export function KotaSiap() {
  const LENCANA = [
    {
      x: 92,
      y: 52,
      ikon: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
      isi: GELAP,
      latar: STABILO,
    },
    { x: 200, y: 36, ikon: 'M12 3.5 3.5 13H9v7.5h6V13h5.5L12 3.5Z', isi: STABILO, latar: GELAP },
    {
      x: 308,
      y: 56,
      ikon: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
      isi: GELAP,
      latar: STABILO,
    },
  ];
  return (
    <svg
      viewBox="0 0 400 220"
      className="h-auto w-full max-w-[520px]"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx={200}
        cy={118}
        rx={182}
        ry={82}
        stroke={TINTA}
        strokeWidth={1.5}
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <g stroke={TINTA} strokeWidth={3} strokeLinejoin="round">
        <rect x={34} y={140} width={62} height={56} rx={6} fill={KERTAS} />
        <rect x={108} y={116} width={56} height={80} rx={6} fill={KERTAS} />
        <rect x={176} y={132} width={66} height={64} rx={6} fill={STABILO} />
        <rect x={254} y={104} width={52} height={92} rx={6} fill={KERTAS} />
        <rect x={318} y={146} width={50} height={50} rx={6} fill={KERTAS} />
      </g>
      <g stroke={TINTA} strokeWidth={2} opacity={0.5}>
        <path d="M50 156h30M50 172h30M122 132h28M122 150h28M122 168h28M268 120h24M268 138h24M268 156h24M332 162h22M332 178h22" />
      </g>
      <path d="M16 196H384" stroke={TINTA} strokeWidth={4} strokeLinecap="round" />
      {LENCANA.map((lencana, index) => (
        <g key={lencana.x} className="tt-pop" style={jeda(120 + index * 160)}>
          <circle
            cx={lencana.x}
            cy={lencana.y}
            r={26}
            fill={lencana.latar}
            stroke={TINTA}
            strokeWidth={3}
          />
          <path
            transform={`translate(${lencana.x - 12} ${lencana.y - 12})`}
            d={lencana.ikon}
            stroke={lencana.isi}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
      <circle cx={30} cy={70} r={6} fill={STABILO} stroke={TINTA} strokeWidth={2.5} />
      <circle cx={372} cy={96} r={5} fill={TINTA} />
      <circle cx={152} cy={28} r={4} fill={TINTA} />
    </svg>
  );
}
