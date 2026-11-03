import { LoadingDots } from './LogoLoader';
import { LogoMark } from './LogoMark';

/**
 * Pemuat menutupi layar untuk proses singkat seperti keluar akun: logo terisi dari bawah dan
 * tiga titik, sama dengan pemuat halaman. Muncul setelah jeda pendek (`load-late`) supaya proses
 * yang cepat tidak berkedip.
 */
export function PemuatLayar({ label }: { label: string }) {
  return (
    <div role="status" className="fixed inset-0 z-[1500] grid place-items-center bg-ground/85 px-4">
      <div className="load-late flex flex-col items-center gap-5">
        <div className="relative w-16">
          <LogoMark className="h-auto w-full opacity-15" />
          <LogoMark className="load-air absolute inset-0 h-auto w-full" />
        </div>
        <LoadingDots />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
