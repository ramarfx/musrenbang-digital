import { zodResolver } from '@hookform/resolvers/zod';
import { TEXT_LIMITS, proposalInputSchema } from '@musrenbang/shared';
import { useEffect } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { LocationPicker } from '@/components/map/LocationPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useCategoriesQuery } from '@/features/categories/queries';
import { useCreateProposalMutation } from '../queries';

const formSchema = z.object({
  judul: z
    .string()
    .trim()
    .min(TEXT_LIMITS.judulMin, `Judul minimal ${TEXT_LIMITS.judulMin} karakter.`)
    .max(TEXT_LIMITS.judulMaks, `Judul maksimal ${TEXT_LIMITS.judulMaks} karakter.`),
  deskripsi: z
    .string()
    .trim()
    .min(TEXT_LIMITS.deskripsiMin, `Deskripsi minimal ${TEXT_LIMITS.deskripsiMin} karakter.`)
    .max(TEXT_LIMITS.deskripsiMaks, `Deskripsi maksimal ${TEXT_LIMITS.deskripsiMaks} karakter.`),
  kategori: z.string().min(1, 'Pilih kategori.'),
  lokasi: z.string().trim().max(TEXT_LIMITS.lokasiMaks, 'Lokasi terlalu panjang.'),
  estimasi_biaya: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Isi angka rupiah tanpa titik atau koma.')
    .max(15, 'Angka terlalu panjang.'),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProposalForm() {
  const navigate = useNavigate();
  const categoriesQuery = useCategoriesQuery();
  const mutation = useCreateProposalMutation();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      judul: '',
      deskripsi: '',
      kategori: '',
      lokasi: '',
      estimasi_biaya: '',
      latitude: null,
      longitude: null,
    },
  });

  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');

  useEffect(() => {
    const first = categoriesQuery.data?.[0]?.nama;
    if (first && !form.getValues('kategori')) {
      form.setValue('kategori', first);
    }
  }, [categoriesQuery.data, form]);

  const onSubmit = form.handleSubmit((values) => {
    const parsed = proposalInputSchema.safeParse({
      ...values,
      lokasi: values.lokasi.length > 0 ? values.lokasi : null,
      estimasi_biaya: Number(values.estimasi_biaya || 0),
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const firstPath = issue.path[0];
        if (typeof firstPath === 'string') {
          form.setError(firstPath as FieldPath<FormValues>, { message: issue.message });
        }
      }
      return;
    }

    mutation.mutate(parsed.data, {
      onSuccess: (id) => {
        toast.success('Usulan berhasil dikirim.');
        navigate(`/usulan/${id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  });

  if (categoriesQuery.isPending) {
    return (
      <Card className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </Card>
    );
  }

  if (categoriesQuery.isError) {
    return (
      <ErrorState
        message={categoriesQuery.error.message}
        onRetry={() => {
          void categoriesQuery.refetch();
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card className="space-y-4">
        <Field
          label="Judul usulan"
          htmlFor="judul"
          error={form.formState.errors.judul?.message}
          required
        >
          <Input
            id="judul"
            placeholder="cth. Perbaikan trotoar dan penerangan Jl. Melati"
            invalid={Boolean(form.formState.errors.judul)}
            {...form.register('judul')}
          />
        </Field>

        <Field
          label="Deskripsi"
          htmlFor="deskripsi"
          error={form.formState.errors.deskripsi?.message}
          hint={`Jelaskan masalah, lokasi, dan manfaatnya. Minimal ${TEXT_LIMITS.deskripsiMin} karakter.`}
          required
        >
          <Textarea
            id="deskripsi"
            rows={5}
            placeholder="Apa masalahnya, siapa yang terdampak, dan apa yang perlu dilakukan?"
            invalid={Boolean(form.formState.errors.deskripsi)}
            {...form.register('deskripsi')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Kategori"
            htmlFor="kategori"
            error={form.formState.errors.kategori?.message}
            required
          >
            <Select
              id="kategori"
              invalid={Boolean(form.formState.errors.kategori)}
              {...form.register('kategori')}
            >
              {categoriesQuery.data.map((category) => (
                <option key={category.id} value={category.nama}>
                  {category.nama}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Estimasi biaya (rupiah)"
            htmlFor="estimasi"
            error={form.formState.errors.estimasi_biaya?.message}
            hint="Boleh dikosongkan bila belum tahu."
          >
            <Input
              id="estimasi"
              type="text"
              inputMode="numeric"
              placeholder="cth. 450000000"
              invalid={Boolean(form.formState.errors.estimasi_biaya)}
              {...form.register('estimasi_biaya')}
            />
          </Field>
        </div>

        <Field label="Lokasi (teks)" htmlFor="lokasi" error={form.formState.errors.lokasi?.message}>
          <Input
            id="lokasi"
            placeholder="cth. Jl. Raya Bogor, Kramat Jati"
            invalid={Boolean(form.formState.errors.lokasi)}
            {...form.register('lokasi')}
          />
        </Field>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-stone-900">Titik di peta (opsional)</h2>
            <p className="text-sm text-stone-500">
              Klik peta untuk menandai lokasi. Titik membantu warga lain menemukan usulanmu.
            </p>
          </div>
          {latitude !== null && longitude !== null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                form.setValue('latitude', null);
                form.setValue('longitude', null);
              }}
            >
              Hapus titik
            </Button>
          )}
        </div>
        <div className="mt-3">
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              form.setValue('latitude', lat, { shouldValidate: true });
              form.setValue('longitude', lng, { shouldValidate: true });
            }}
          />
        </div>
        {latitude !== null && longitude !== null && (
          <p className="mt-2 text-sm text-stone-600">
            Dipilih: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        )}
        {form.formState.errors.latitude?.message && (
          <p className="mt-2 text-sm text-red-700">{form.formState.errors.latitude.message}</p>
        )}
      </Card>

      {mutation.error && (
        <ErrorState title="Gagal mengirim usulan" message={mutation.error.message} />
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isLoading={mutation.isPending}>
          Kirim Usulan
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
          Batal
        </Button>
      </div>

      <p className="text-xs text-stone-500">
        Semua usulan tampil publik. Jangan mencantumkan data pribadi yang sensitif. Baca{' '}
        <Link to="/apbd" className="underline">
          data APBD
        </Link>{' '}
        sebelum mengusulkan.
      </p>
    </form>
  );
}
