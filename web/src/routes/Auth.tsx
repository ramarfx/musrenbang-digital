import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, HeroCard } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { LoginForm, RegisterForm, useAuth, useGoogleSignInMutation } from '@/features/auth';
import { cn } from '@/lib/cn';

type Mode = 'login' | 'daftar';

const MODE: { nilai: Mode; label: string }[] = [
  { nilai: 'login', label: 'Masuk' },
  { nilai: 'daftar', label: 'Daftar' },
];

/** Hal-hal yang memang butuh akun di aplikasi ini. Tiap baris punya fitur nyata. */
const MANFAAT: { ikon: IconName; judul: string; isi: string }[] = [
  {
    ikon: 'usulan',
    judul: 'Usulkan program',
    isi: 'Tulis masalah di lingkunganmu dan tandai lokasinya di peta.',
  },
  {
    ikon: 'panah-atas',
    judul: 'Upvote usulan warga',
    isi: 'Satu akun satu upvote untuk tiap usulan, dan bisa dibatalkan.',
  },
  {
    ikon: 'simulator',
    judul: 'Urutkan prioritasmu',
    isi: 'Urutanmu digabung dengan warga lain lalu dibandingkan dengan APBD.',
  },
  {
    ikon: 'lonceng',
    judul: 'Pantau usulanmu',
    isi: 'Lihat kapan statusnya berubah, dari Diajukan sampai Selesai.',
  },
];

export default function Auth() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: Mode = searchParams.get('mode') === 'daftar' ? 'daftar' : 'login';
  const googleMutation = useGoogleSignInMutation();
  const dariHalaman = (location.state as { from?: string } | null)?.from;

  if (loading) return <PageLoader label="Memeriksa sesi..." />;

  if (user) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Kamu sudah masuk"
          description={`Masuk sebagai ${profile?.nama ?? user.email ?? 'warga'}.`}
        />
        <Card>
          <p className="text-ink">Lanjutkan menjelajah usulan atau urutkan prioritasmu.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/beranda" className={buttonClass('primary', 'md')}>
              Ke beranda
            </Link>
            <Link to="/simulator" className={buttonClass('outline', 'md')}>
              Buka simulator
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === 'daftar' ? 'Daftar akun' : 'Masuk'}
        description={
          mode === 'daftar'
            ? 'Cukup nama, email, dan password. Tanpa KTP atau NIK.'
            : 'Masuk dengan email dan password yang kamu daftarkan.'
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <HeroCard className="order-last lg:order-first">
          <p className="text-[13px] text-white/75">Dengan akun, kamu bisa</p>
          <ul className="stagger mt-3">
            {MANFAAT.map((item) => (
              <li
                key={item.judul}
                className="flex gap-3.5 border-t border-white/15 py-3.5 first:border-t-0 first:pt-0"
              >
                <span
                  aria-hidden="true"
                  className="grid size-9 flex-none place-items-center rounded-xl bg-hijau text-hijau-terang"
                >
                  <Icon name={item.ikon} size={18} />
                </span>
                <span className="min-w-0">
                  <b className="block font-semibold">{item.judul}</b>
                  <span className="mt-0.5 block text-[13.5px] text-white/75">{item.isi}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-white/15 pt-4 text-[13px] text-white/75">
            Tanpa akun pun kamu tetap bisa melihat usulan, peta, data APBD, dan halaman Bandingkan.
          </p>
        </HeroCard>

        <Card className="sm:p-8">
          <div
            role="group"
            aria-label="Masuk atau daftar"
            className="mb-6 inline-flex rounded-xl border border-border bg-ground p-0.5"
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
                  'h-9 min-w-24 rounded-[10px] px-4 text-[13px] font-semibold transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                  mode === pilihan.nilai
                    ? 'bg-ink text-on-ink'
                    : 'text-muted hover:bg-active hover:text-ink',
                )}
              >
                {pilihan.label}
              </button>
            ))}
          </div>

          {dariHalaman && dariHalaman !== '/' && (
            <p className="mb-5 rounded-xl bg-active px-3.5 py-2.5 text-[13px] text-muted">
              Halaman tadi butuh akun. Setelah masuk, kamu kembali ke sana.
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            isLoading={googleMutation.isPending}
            onClick={() =>
              googleMutation.mutate(undefined, { onError: (error) => toast.error(error.message) })
            }
          >
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
      </div>
    </div>
  );
}
