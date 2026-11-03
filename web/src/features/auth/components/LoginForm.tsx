import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@musrenbang/shared';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWelcomeSplash } from '@/components/brand/WelcomeSplash';
import { LoadingDots } from '@/components/brand/LogoLoader';
import { LogoMark } from '@/components/brand/LogoMark';
import { Button } from '@/components/ui/Button';
import { toastGagalMasuk } from '@/components/ui/ToastMasuk';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { tandaiPernahMasuk, tujuanSetelahLogin } from '@/lib/halamanAsal';
import { useSignInMutation } from '../queries';

type LoginLocationState = { from?: string } | null;

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = tujuanSetelahLogin((location.state as LoginLocationState)?.from);
  const mutation = useSignInMutation();
  const splash = useWelcomeSplash();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Pakai await, bukan callback mutate: begitu sesi terbentuk, halaman Auth menampilkan "Kamu sudah
  // masuk" dan formulir ini lepas dari layar, sedangkan callback mutate ikut hilang bersamanya.
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      toastGagalMasuk(error instanceof Error ? error.message : undefined);
      return;
    }
    tandaiPernahMasuk();
    splash.play();
    navigate(from, { replace: true });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="relative space-y-4"
      noValidate
      aria-busy={mutation.isPending}
    >
      <Field
        label="Email"
        htmlFor="login-email"
        error={form.formState.errors.email?.message}
        required
      >
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          invalid={Boolean(form.formState.errors.email)}
          {...form.register('email')}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="login-password"
        error={form.formState.errors.password?.message}
        required
      >
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          placeholder="Minimal 8 karakter"
          invalid={Boolean(form.formState.errors.password)}
          {...form.register('password')}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        Masuk
      </Button>

      {mutation.isPending && (
        <div
          role="status"
          className="absolute -inset-3 z-10 grid place-items-center rounded-2xl bg-surface/90 anim-page"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-14">
              <LogoMark className="h-auto w-full opacity-15" />
              <LogoMark className="load-air absolute inset-0 h-auto w-full" />
            </div>
            <LoadingDots />
            <span className="sr-only">Memeriksa akun</span>
          </div>
        </div>
      )}
    </form>
  );
}
