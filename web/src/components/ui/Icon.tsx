/**
 * Ikon garis 24px dari prototipe Desain 1 (bukan pustaka ikon), satu ketebalan.
 * Selalu dekoratif: label teks di sebelahnya yang memberi nama.
 */
const PATHS = {
  beranda: 'M3 10.5 12 3l9 7.5M5 9v12h14V9M10 21v-6h4v6',
  simulator: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  bandingkan: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  usulan: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z',
  apbd: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6',
  admin: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z',
  lokasi: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  tutup: 'M6 6l12 12M18 6 6 18',
  'panah-atas': 'M12 3.5 3.5 13H9v7.5h6V13h5.5L12 3.5Z',
  lonceng: 'M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9ZM10 20a2 2 0 0 0 4 0',
  daftar: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  profil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  buku: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM4 21h15',
  matahari:
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  bulan: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  panahBawah: 'M6 9l6 6 6-6',
  centang: 'M5 12.5l4.5 4.5L19 7.5',
  mata: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  mataCoret: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 4l16 16',
  perbesar: 'M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5',
  cari: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  sasaran: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  kembali: 'M19 12H5M11 6l-6 6 6 6',
  pensil: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4',
  sampah: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  filled = false,
}: {
  name: IconName;
  size?: number;
  /** Isi dengan warna teks (mis. panah upvote yang sudah ditekan). */
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      <path d={PATHS[name]} />
      {name === 'simulator' && (
        <>
          <circle cx="15" cy="7" r="2" />
          <circle cx="9" cy="17" r="2" />
        </>
      )}
      {name === 'lokasi' && <circle cx="12" cy="10" r="2.5" />}
    </svg>
  );
}
