/**
 * Ikon garis 24px dari prototipe Desain 1 (bukan pustaka ikon), satu ketebalan.
 * Selalu dekoratif: label teks di sebelahnya yang memberi nama.
 */
const JALUR = {
  beranda: 'M3 10.5 12 3l9 7.5M5 9v12h14V9M10 21v-6h4v6',
  simulator: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  bandingkan: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  usulan: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z',
  apbd: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6',
  admin: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z',
  lokasi: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  tutup: 'M6 6l12 12M18 6 6 18',
} as const;

export type NamaIkon = keyof typeof JALUR;

export function Ikon({ nama, ukuran = 18 }: { nama: NamaIkon; ukuran?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ukuran}
      height={ukuran}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      <path d={JALUR[nama]} />
      {nama === 'simulator' && (
        <>
          <circle cx="15" cy="7" r="2" />
          <circle cx="9" cy="17" r="2" />
        </>
      )}
      {nama === 'lokasi' && <circle cx="12" cy="10" r="2.5" />}
    </svg>
  );
}
