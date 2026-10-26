import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@musrenbang/shared';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { useSignInMutation } from '../queries';

type LoginLocationState = { from?: string } | null;

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LoginLocationState)?.from ?? '/';
  const mutation = useSignInMutation();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success('Berhasil masuk.');
        navigate(from, { replace: true });
      },
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="Minimal 8 karakter"
          invalid={Boolean(form.formState.errors.password)}
          {...form.register('password')}
        />
      </Field>

      {mutation.error && <ErrorState title="Gagal masuk" message={mutation.error.message} />}

      <Button type="submit" className="w-full" isLoading={mutation.isPending}>
        Masuk
      </Button>

      <p className="text-center text-sm text-stone-600">
        Belum punya akun?{' '}
        <Link to="/login?mode=daftar" className="font-medium text-emerald-800 underline">
          Daftar
        </Link>
      </p>
    </form>
  );
}
