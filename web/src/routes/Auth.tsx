import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { LoginForm, RegisterForm, useAuth } from '@/features/auth';
import { Link, useSearchParams } from 'react-router-dom';

export default function Auth() {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'daftar' ? 'daftar' : 'login';

  if (loading) return <PageLoader label="Memeriksa sesi..." />;

  if (user) {
    return (
      <EmptyState
        title="Kamu sudah masuk"
        description="Akunmu sudah aktif. Lanjutkan menjelajah usulan atau buka simulator anggaran."
        action={
          <Link to="/" className="text-sm font-medium text-emerald-800 underline">
            Kembali ke beranda
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageHeader
        title={mode === 'daftar' ? 'Daftar akun' : 'Masuk'}
        description={
          mode === 'daftar'
            ? 'Satu akun untuk mengusulkan, memberi suara, dan menyimpan alokasi anggaran virtual.'
            : 'Masuk untuk mengusulkan program, memberi suara, dan menyimpan simulasi anggaran.'
        }
      />

      <Card>
        {mode === 'daftar' ? (
          <RegisterForm onNeedsLogin={() => setSearchParams({}, { replace: true })} />
        ) : (
          <LoginForm />
        )}
      </Card>

      <div className="text-center text-sm text-stone-500">
        {mode === 'daftar' ? (
          <button
            type="button"
            className="font-medium text-emerald-800 underline"
            onClick={() => setSearchParams({}, { replace: true })}
          >
            Sudah punya akun? Masuk
          </button>
        ) : (
          <button
            type="button"
            className="font-medium text-emerald-800 underline"
            onClick={() => setSearchParams({ mode: 'daftar' }, { replace: true })}
          >
            Belum punya akun? Daftar
          </button>
        )}
      </div>
    </div>
  );
}
