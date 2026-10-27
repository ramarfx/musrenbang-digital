import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@musrenbang/shared';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWelcomeSplash } from '@/components/brand/WelcomeSplash';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useSignUpMutation } from '../queries';

type LoginLocationState = { from?: string } | null;

export function RegisterForm({ onNeedsLogin }: { onNeedsLogin: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LoginLocationState)?.from ?? '/';
  const mutation = useSignUpMutation();
  const splash = useWelcomeSplash();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nama: '', email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: (data) => {
        if (data.session) {
          splash.play();
          toast.success('Akun dibuat. Selamat bergabung!');
          navigate(from, { replace: true });
          return;
        }
        toast.info('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.');
        onNeedsLogin();
      },
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field
        label="Nama"
        htmlFor="register-nama"
        error={form.formState.errors.nama?.message}
        required
      >
        <Input
          id="register-nama"
          autoComplete="name"
          placeholder="Nama yang tampil di usulan"
          invalid={Boolean(form.formState.errors.nama)}
          {...form.register('nama')}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="register-email"
        error={form.formState.errors.email?.message}
        required
      >
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          invalid={Boolean(form.formState.errors.email)}
          {...form.register('email')}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="register-password"
        error={form.formState.errors.password?.message}
        hint="Minimal 8 karakter. Jangan gunakan password yang sama dengan akun lain."
        required
      >
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          invalid={Boolean(form.formState.errors.password)}
          {...form.register('password')}
        />
      </Field>

      {mutation.error && <ErrorState title="Gagal mendaftar" message={mutation.error.message} />}

      <Button type="submit" className="w-full" isLoading={mutation.isPending}>
        Daftar
      </Button>
    </form>
  );
}
