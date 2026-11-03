import { toast } from 'sonner';

const GAYA =
  'flex w-[min(320px,calc(100vw-32px))] items-center gap-3 rounded-2xl border-[1.5px] bg-surface p-3 shadow-[0_3px_0_var(--edge)]';

function Tanda({ gagal, keluar = false }: { gagal: boolean; keluar?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-7 flex-none place-items-center rounded-full ${gagal ? 'bg-red-700 text-white' : 'bg-hijau-terang text-hitam'}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="tanda-toast"
      >
        <path
          d={
            gagal
              ? 'M7 7l10 10M17 7L7 17'
              : keluar
                ? 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9'
                : 'M5 12.5l4.5 4.5L19 7.5'
          }
        />
      </svg>
    </span>
  );
}

function Kartu({
  id,
  jenis,
  judul,
  isi,
}: {
  id: string | number;
  jenis: 'berhasil' | 'gagal' | 'keluar';
  judul: string;
  isi?: string;
}) {
  const gagal = jenis === 'gagal';
  return (
    <div
      role={gagal ? 'alert' : 'status'}
      className={`${GAYA} ${gagal ? 'border-red-700 shadow-[0_3px_0_var(--color-red-700)]' : 'border-edge'}`}
    >
      <Tanda gagal={gagal} keluar={jenis === 'keluar'} />
      <span className="min-w-0 flex-1">
        <b className="block font-semibold text-ink">{judul}</b>
        {isi && (
          <span className="block text-[13px] text-muted [overflow-wrap:anywhere]">{isi}</span>
        )}
      </span>
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => toast.dismiss(id)}
        className="grid size-7 flex-none place-items-center rounded-lg text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-active hover:text-ink active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-warga"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

/** Kartu di pojok kanan atas setelah masuk berhasil: judul, lalu sapaan dengan nama depan. */
export function toastSelamatDatang(nama: string) {
  toast.custom(
    (id) => <Kartu id={id} jenis="berhasil" judul="Login berhasil" isi={`Halo, ${nama}`} />,
    {
      duration: 4000,
    },
  );
}

/** Kartu merah di pojok kanan atas saat masuk atau keluar gagal. */
export function toastGagalMasuk(pesan?: string, judul = 'Gagal masuk') {
  toast.custom((id) => <Kartu id={id} jenis="gagal" judul={judul} isi={pesan} />, {
    duration: 5000,
  });
}

/** Kartu di pojok kanan atas setelah keluar akun. */
export function toastSudahKeluar(nama: string) {
  toast.custom(
    (id) => <Kartu id={id} jenis="keluar" judul="Berhasil keluar" isi={`Sampai jumpa, ${nama}`} />,
    {
      duration: 3500,
    },
  );
}
