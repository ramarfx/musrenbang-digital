import {
  ALLOCATION_STEP,
  DEFAULT_VIRTUAL_BUDGET,
  createBudgetAllocationSchema,
  evenAllocation,
  totalAllocation,
} from '@musrenbang/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth';
import { useCategoriesQuery } from '@/features/categories/queries';
import { useAppConfigQuery } from '@/features/config/queries';
import { formatRupiah } from '@/lib/format';
import { useSaveAllocationsMutation, useUserAllocationsQuery } from '../queries';

export function BudgetSimulator() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const categoriesQuery = useCategoriesQuery();
  const configQuery = useAppConfigQuery();
  const allocationsQuery = useUserAllocationsQuery(userId);
  const saveMutation = useSaveAllocationsMutation(userId);

  const [alokasi, setAlokasi] = useState<Record<string, number>>({});
  const initializedRef = useRef<string | null>(null);

  const categories = useMemo(
    () => categoriesQuery.data?.map((category) => category.nama) ?? [],
    [categoriesQuery.data],
  );
  const budget = configQuery.data?.virtualBudgetPerWarga ?? DEFAULT_VIRTUAL_BUDGET;

  // Simulator anonim mulai dari nol setiap kali daftar kategori/user berubah.
  useEffect(() => {
    if (userId !== null || categories.length === 0) return;
    initializedRef.current = null;
    setAlokasi(Object.fromEntries(categories.map((kategori) => [kategori, 0])));
  }, [userId, categories]);

  // Pengguna login memuat alokasi tersimpan sekali; perubahan slider setelahnya
  // tidak boleh ditimpa oleh refetch cache.
  useEffect(() => {
    if (userId === null || categories.length === 0 || !allocationsQuery.isSuccess) return;
    const identity = `${userId}:${categories.join('|')}`;
    if (initializedRef.current === identity) return;

    const saved = new Map(allocationsQuery.data.map((row) => [row.kategori, row.jumlah]));
    setAlokasi(
      Object.fromEntries(categories.map((kategori) => [kategori, saved.get(kategori) ?? 0])),
    );
    initializedRef.current = identity;
  }, [userId, categories, allocationsQuery.isSuccess, allocationsQuery.data]);

  const items = useMemo(
    () =>
      categories.map((kategori) => ({
        kategori,
        jumlah: alokasi[kategori] ?? 0,
      })),
    [alokasi, categories],
  );
  const total = totalAllocation(items);
  const sisa = budget - total;
  const kelebihan = sisa < 0;
  const persenTerpakai = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  const ubahNilai = (kategori: string, nilai: number) => {
    const aman = Number.isFinite(nilai) ? Math.max(0, Math.min(budget, nilai)) : 0;
    setAlokasi((previous) => ({ ...previous, [kategori]: aman }));
  };

  const simpan = () => {
    const validation = createBudgetAllocationSchema(budget).safeParse(items);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Alokasi belum valid.');
      return;
    }
    saveMutation.mutate(validation.data, {
      onSuccess: () => toast.success('Alokasi tersimpan. Gap warga ikut diperbarui.'),
      onError: (error) => toast.error(error.message),
    });
  };

  if (categoriesQuery.isPending || configQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
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

  if (configQuery.isError) {
    return (
      <ErrorState
        message={configQuery.error.message}
        onRetry={() => {
          void configQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="sticky top-3 z-20 border-emerald-200 bg-emerald-50/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-900">
              Total dialokasikan: <strong>{formatRupiah(total)}</strong>
            </p>
            <p className={`text-sm font-bold ${kelebihan ? 'text-red-700' : 'text-emerald-800'}`}>
              Sisa: {formatRupiah(sisa)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAlokasi(
                  Object.fromEntries(
                    evenAllocation(categories, budget).map((item) => [item.kategori, item.jumlah]),
                  ),
                );
              }}
            >
              Bagi rata
            </Button>
            {userId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAlokasi(Object.fromEntries(categories.map((kategori) => [kategori, 0])));
                  initializedRef.current = null;
                }}
              >
                Kosongkan
              </Button>
            )}
            {userId && (
              <Button
                type="button"
                size="sm"
                isLoading={saveMutation.isPending}
                disabled={kelebihan}
                onClick={simpan}
              >
                Simpan alokasi
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-200">
          <div
            className={`h-full rounded-full transition-all ${kelebihan ? 'bg-red-600' : 'bg-emerald-700'}`}
            style={{ width: `${persenTerpakai}%` }}
          />
        </div>
        {kelebihan && (
          <p className="mt-2 text-sm text-red-700">
            Total melebihi anggaran virtual. Kurangi alokasi sebelum menyimpan.
          </p>
        )}
      </Card>

      {!userId && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Simulasi bisa dicoba tanpa login, tetapi menyimpan alokasi butuh akun.{' '}
          <Link to="/login" className="font-semibold underline">
            Masuk dulu
          </Link>
          .
        </p>
      )}

      <div className="space-y-3">
        {categories.map((kategori) => {
          const nilai = alokasi[kategori] ?? 0;
          const persen = budget > 0 ? (nilai / budget) * 100 : 0;
          return (
            <Card key={kategori}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor={`slider-${kategori}`} className="font-medium text-stone-900">
                  {kategori}
                </label>
                <span className="text-sm tabular-nums text-stone-600">
                  {formatRupiah(nilai)}{' '}
                  <span className="text-stone-400">({persen.toFixed(1)}%)</span>
                </span>
              </div>
              <input
                id={`slider-${kategori}`}
                type="range"
                min={0}
                max={budget}
                step={ALLOCATION_STEP}
                value={nilai}
                onChange={(event) => ubahNilai(kategori, Number(event.target.value))}
                className="mt-2 w-full accent-emerald-800"
              />
            </Card>
          );
        })}
      </div>

      {saveMutation.error && (
        <ErrorState title="Gagal menyimpan alokasi" message={saveMutation.error.message} />
      )}
    </div>
  );
}
