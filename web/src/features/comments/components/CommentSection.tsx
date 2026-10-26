import { commentInputSchema } from '@musrenbang/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/features/auth';
import { formatTanggalWaktu } from '@/lib/format';
import { useCommentsQuery, useCreateCommentMutation } from '../queries';

const formSchema = z.object({ isi: commentInputSchema.shape.isi });
type FormValues = z.infer<typeof formSchema>;

export function CommentSection({ proposalId }: { proposalId: number }) {
  const { user } = useAuth();
  const commentsQuery = useCommentsQuery(proposalId);
  const mutation = useCreateCommentMutation(proposalId);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { isi: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values.isi, {
      onSuccess: () => {
        form.reset();
        toast.success('Komentar terkirim.');
      },
      onError: (error) => toast.error(error.message),
    });
  });

  return (
    <Card>
      <h2 className="text-lg font-bold text-stone-900">Komentar warga</h2>

      {commentsQuery.isPending && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {commentsQuery.isError && (
        <div className="mt-4">
          <ErrorState
            message={commentsQuery.error.message}
            onRetry={() => {
              void commentsQuery.refetch();
            }}
          />
        </div>
      )}

      {commentsQuery.isSuccess && commentsQuery.data.length === 0 && (
        <EmptyState
          className="mt-4"
          title="Belum ada komentar"
          description="Jadilah yang pertama memberi masukan yang konstruktif."
        />
      )}

      {commentsQuery.isSuccess && commentsQuery.data.length > 0 && (
        <ul className="mt-4 space-y-3">
          {commentsQuery.data.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-wrap justify-between gap-2 text-xs text-stone-500">
                <span className="font-medium text-stone-700">{comment.penulis_nama}</span>
                <span>{formatTanggalWaktu(comment.dibuat_pada)}</span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{comment.isi}</p>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          <Field
            label="Tulis komentar"
            htmlFor="komentar"
            error={form.formState.errors.isi?.message}
          >
            <Textarea
              id="komentar"
              rows={3}
              placeholder="Tambahkan informasi, pertanyaan, atau dukungan..."
              invalid={Boolean(form.formState.errors.isi)}
              {...form.register('isi')}
            />
          </Field>
          <Button type="submit" size="sm" isLoading={mutation.isPending}>
            Kirim komentar
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-stone-600">
          <Link to="/login" className="font-medium text-emerald-800 underline">
            Masuk
          </Link>{' '}
          untuk ikut berkomentar.
        </p>
      )}
    </Card>
  );
}
