import logoWarna from '@/assets/logo/mb-lockup-horizontal-warna.svg';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LogoGoogle } from '@/components/ui/LogoGoogle';
import { PageLoader } from '@/components/ui/PageLoader';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoginForm, RegisterForm, useAuth, useGoogleSignInMutation } from '@/features/auth';
import { cn } from '@/lib/cn';

type Mode = 'login' | 'daftar';

const MODE: { nilai: Mode; label: string }[] = [
  { nilai: 'login', label: 'Masuk' },
  { nilai: 'daftar', label: 'Daftar' },
];

export default function Auth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: Mode = searchParams.get('mode') === 'daftar' ? 'daftar' : 'login';
  const googleMutation = useGoogleSignInMutation();
  const dariHalaman = (location.state as { from?: string } | null)?.from;

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ground text-ink">
        <PageLoader label="Memeriksa sesi..." />
      </div>
    );
  }

  if (user) {
    const tujuan =
      dariHalaman && dariHalaman !== '/' && dariHalaman !== '/login' ? dariHalaman : '/beranda';
    return <Navigate to={tujuan} replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ground text-ink">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex min-h-11 items-center rounded-xl px-1 select-none">
          <img
            src={logoWarna}
            alt="Musrenbang Digital"
            draggable={false}
            className="h-8 w-auto sm:h-9"
          />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {mode === 'daftar' ? 'Daftar Akun Warga' : 'Masuk ke Akun Anda'}
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              {mode === 'daftar'
                ? 'Cukup nama, email, dan password. Tanpa KTP atau NIK.'
                : 'Gunakan email dan password yang sudah Anda daftarkan.'}
            </p>
          </div>

          <Card className="p-5 sm:p-7">
            <div
              role="group"
              aria-label="Masuk atau daftar"
              className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-ground p-1"
            >
              {MODE.map((pilihan) => (
                <button
                  key={pilihan.nilai}
                  type="button"
                  aria-pressed={mode === pilihan.nilai}
                  onClick={() =>
                    setSearchParams(pilihan.nilai === 'daftar' ? { mode: 'daftar' } : {}, {
                      replace: true,
                      state: location.state,
                    })
                  }
                  className={cn(
                    'h-10 rounded-[10px] text-sm font-semibold transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                    mode === pilihan.nilai
                      ? 'bg-ink text-on-ink'
                      : 'text-muted hover:bg-active hover:text-ink',
                  )}
                >
                  {pilihan.label}
                </button>
              ))}
            </div>

            {dariHalaman && dariHalaman !== '/' && dariHalaman !== '/login' && (
              <p className="mb-4 rounded-xl bg-active px-3.5 py-2.5 text-[13px] text-muted">
                Halaman tadi butuh akun. Setelah masuk, Anda kembali ke sana.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              isLoading={googleMutation.isPending}
              onClick={() =>
                googleMutation.mutate(undefined, {
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              <LogoGoogle />
              Lanjut dengan Google
            </Button>
            <div className="my-5 flex items-center gap-3 text-[13px] text-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-rule" />
              atau dengan email
              <span className="h-px flex-1 bg-rule" />
            </div>

            {mode === 'daftar' ? (
              <RegisterForm onNeedsLogin={() => setSearchParams({}, { replace: true })} />
            ) : (
              <LoginForm />
            )}
          </Card>

          <p className="mt-5 text-center text-[13px] text-muted">
            Tanpa akun pun Anda tetap bisa melihat usulan, peta, dan data APBD.{' '}
            <Link to="/" className="font-semibold text-warga underline">
              Kembali ke halaman utama
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
