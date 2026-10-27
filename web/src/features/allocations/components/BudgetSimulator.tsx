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
import { Card, HeroCard } from '@/components/ui/Card';
import { buildRingSlices, DonutRing } from '@/components/ui/DonutRing';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Slider } from '@/components/ui/Slider';
import { useAuth } from '@/features/auth';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { useCategoriesQuery } from '@/features/categories/queries';
import { getCategoryInfo } from '@/features/categories/info';
import { useAppConfigQuery } from '@/features/config/queries';
import { useGapQuery } from '@/features/gap/queries';
import { formatRupiah } from '@/lib/format';
import { allocateByWeights, formatSelisih } from '../lib';
import { AllocationDetailDialog } from './AllocationDetailDialog';
import { useSaveAllocationsMutation, useUserAllocationsQuery } from '../queries';

export function BudgetSimulator() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const categoriesQuery = useCategoriesQuery();
  const configQuery = useAppConfigQuery();
  const allocationsQuery = useUserAllocationsQuery(userId);
  const gapQuery = useGapQuery();
  const saveMutation = useSaveAllocationsMutation(userId);

  const [alokasi, setAlokasi] = useState<Record<string, number>>({});
  const [beranimasi, setBeranimasi] = useState(false);
  const animRef = useRef<number | null>(null);
  const [rincianBuka, setRincianBuka] = useState(false);
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
  const persenTerpakai = budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const terisi = items.filter((item) => item.jumlah > 0).length;

  // Slider tidak bisa melewati sisa dana dan tidak pernah di bawah 0 (mis. alokasi
  // tersimpan lebih besar dari anggaran yang baru).
  const batalkanAnimasi = () => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    setBeranimasi(false);
  };

  // Hentikan animasi yang masih berjalan kalau komponen dilepas.
  useEffect(
    () => () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  /**
   * Meluncurkan semua nilai dari posisi sekarang ke `target` (260ms, ease-out kuat).
   * Dipakai tombol Bagi rata, Mulai dari porsi APBD, dan Kosongkan. Menggeser slider
   * sendiri tetap seketika, dan langsung membatalkan animasi yang sedang jalan.
   * Hasil akhir selalu tepat sama dengan `target`.
   */
  const animasiKe = (target: Record<string, number>) => {
    batalkanAnimasi();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAlokasi(target);
      return;
    }
    const awal = { ...alokasi };
    const mulai = performance.now();
    const durasi = 260;
    setBeranimasi(true);
    const langkah = (sekarang: number) => {
      const t = Math.min(1, (sekarang - mulai) / durasi);
      const e = 1 - Math.pow(1 - t, 4);
      setAlokasi(
        Object.fromEntries(
          categories.map((kategori) => {
            const a = awal[kategori] ?? 0;
            const b = target[kategori] ?? 0;
            return [kategori, t >= 1 ? b : Math.round(a + (b - a) * e)];
          }),
        ),
      );
      if (t < 1) {
        animRef.current = requestAnimationFrame(langkah);
      } else {
        animRef.current = null;
        setBeranimasi(false);
      }
    };
    animRef.current = requestAnimationFrame(langkah);
  };

  const ubahNilai = (kategori: string, nilai: number) => {
    batalkanAnimasi();
    const lainnya = total - (alokasi[kategori] ?? 0);
    const batas = Math.max(0, budget - lainnya);
    const aman = Number.isFinite(nilai) ? Math.max(0, Math.min(nilai, batas)) : 0;
    setAlokasi((previous) => ({ ...previous, [kategori]: aman }));
  };

  // Porsi APBD per kategori dari v_gap. Kategori tanpa data APBD berbobot 0.
  const apbdByKategori = useMemo(
    () => Object.fromEntries((gapQuery.data ?? []).map((row) => [row.kategori, row.persen_apbd])),
    [gapQuery.data],
  );
  const bisaMulaiDariApbd = categories.some((kategori) => (apbdByKategori[kategori] ?? 0) > 0);

  const mulaiDariApbd = () => {
    const hasil = allocateByWeights(categories, apbdByKategori, budget, ALLOCATION_STEP);
    if (hasil) animasiKe(hasil);
  };

  // Kartu hanya menampilkan 4 program terbesar + "Lainnya"; rincian lengkap ada di pop-up.
  const ring = buildRingSlices(
    items.map((item) => ({ label: item.kategori, value: item.jumlah })),
    4,
  );
  const ringLabel =
    ring.map((slice) => `${slice.label} ${Math.round((slice.value / budget) * 100)}%`).join(', ') ||
    'Belum ada pembagian';

  // "Pilihanmu dibanding APBD": 3 selisih terbesar dari kategori yang diisi.
  const bandingan = useMemo(() => {
    if (total <= 0 || !bisaMulaiDariApbd) return [];
    return items
      .filter((item) => item.jumlah > 0)
      .map((item) => ({
        kategori: item.kategori,
        selisih: (item.jumlah / total) * 100 - (apbdByKategori[item.kategori] ?? 0),
      }))
      .sort((a, b) => Math.abs(b.selisih) - Math.abs(a.selisih))
      .slice(0, 3);
  }, [items, total, apbdByKategori, bisaMulaiDariApbd]);

  const simpan = () => {
    const validation = createBudgetAllocationSchema(budget).safeParse(items);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Alokasi belum valid.');
      return;
    }
    saveMutation.mutate(validation.data, {
      onSuccess: () => toast.success('Pilihanmu tersimpan. Gap warga ikut diperbarui.'),
      onError: (error) => toast.error(error.message),
    });
  };

  if (categoriesQuery.isPending || configQuery.isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-[640px] w-full rounded-3xl" />
        <Skeleton className="h-[420px] w-full rounded-3xl" />
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

  const siapKirim = sisa === 0 && total > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {bisaMulaiDariApbd && (
          <Button type="button" variant="outline" size="sm" onClick={mulaiDariApbd}>
            Mulai dari porsi APBD
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            animasiKe(
              Object.fromEntries(
                evenAllocation(categories, budget).map((item) => [item.kategori, item.jumlah]),
              ),
            );
          }}
        >
          Bagi rata
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            animasiKe(Object.fromEntries(categories.map((kategori) => [kategori, 0])));
            initializedRef.current = null;
          }}
        >
          Kosongkan
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Kartu kiri meregang mengikuti kolom kanan bila kolom kanan lebih tinggi; barisnya dibagi rata, jadi tidak ada ruang kosong di bawah. */}
        <Card className="lg:flex lg:flex-col lg:self-stretch">
          <div
            role="group"
            aria-label="Pembagian anggaran per program"
            className="stagger lg:flex lg:flex-1 lg:flex-col"
          >
            {categories.map((kategori) => {
              const nilai = alokasi[kategori] ?? 0;
              const persen = budget > 0 ? Math.round((nilai / budget) * 100) : 0;
              return (
                <div
                  key={kategori}
                  className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t border-rule py-3.5 first:border-t-0 first:pt-0 last:pb-0 lg:flex-1 lg:content-center min-[1400px]:grid-cols-[40px_minmax(0,1.1fr)_minmax(120px,1.6fr)_112px]"
                >
                  <CategoryTile kategori={kategori} />
                  <label htmlFor={`slider-${kategori}`} className="min-w-0 font-semibold">
                    {kategori}
                    <span className="block text-[13px] font-normal text-muted">
                      {getCategoryInfo(kategori).deskripsi}
                    </span>
                  </label>
                  <div className="col-span-full row-start-2 min-[1400px]:col-span-1 min-[1400px]:row-start-auto">
                    <Slider
                      id={`slider-${kategori}`}
                      label={kategori}
                      value={nilai}
                      max={budget}
                      step={ALLOCATION_STEP}
                      onChange={(value) => ubahNilai(kategori, value)}
                      valueText={formatRupiah(nilai)}
                    />
                  </div>
                  <div className="text-right font-semibold whitespace-nowrap">
                    {formatRupiah(nilai)}
                    <span className="block text-[13px] font-normal text-muted">{persen}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="stagger order-first flex flex-col gap-4 lg:sticky lg:top-6 lg:order-none">
          <HeroCard>
            {/* Klik ring membuka rincian lengkap semua program di pop-up. */}
            <button
              type="button"
              disabled={total <= 0}
              onClick={() => setRincianBuka(true)}
              aria-haspopup="dialog"
              aria-label="Lihat rincian pembagian dana"
              className="mx-auto block rounded-full transition-[scale] duration-150 ease-out enabled:cursor-zoom-in enabled:hover:scale-[1.03] enabled:active:scale-[0.98]"
            >
              <DonutRing slices={ring} total={total} label={ringLabel} instant={beranimasi}>
                <span className="block text-[12.5px] text-white/75">
                  {kelebihan ? 'Kelebihan' : 'Sisa dana'}
                </span>
                <b className="block text-[19px] font-bold tracking-[-0.02em] whitespace-nowrap">
                  {formatRupiah(Math.abs(sisa))}
                </b>
                <em className="mt-0.5 block text-[12.5px] text-mint not-italic">
                  {persenTerpakai}% terpakai
                </em>
              </DonutRing>
            </button>
            {total > 0 ? (
              <button
                type="button"
                onClick={() => setRincianBuka(true)}
                className="mx-auto mt-3 block text-[13px] font-semibold text-white/90 underline underline-offset-4 transition-colors duration-150 hover:text-white"
              >
                Lihat rincian lengkap
              </button>
            ) : (
              <p className="mx-auto mt-3 text-center text-[13px] text-white/75">
                Geser slider untuk mulai membagi dana.
              </p>
            )}

            {/* Tinggi legenda dipesan untuk 5 baris, supaya kartu tidak memanjang saat dana mulai diisi. */}
            <ul className="mt-5 mb-4 flex min-h-[141.25px] flex-col gap-2.5 text-[13.5px]">
              {ring.length === 0
                ? // Placeholder redup seukuran legenda asli, supaya kartu tidak terlihat bolong.
                  Array.from({ length: 5 }, (_, i) => (
                    <li
                      key={i}
                      aria-hidden="true"
                      className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5"
                    >
                      <i className="size-3 rounded-[4px] bg-white/20" />
                      <span
                        className="h-2.5 rounded-full bg-white/12"
                        style={{ width: `${70 - i * 9}%` }}
                      />
                      <b className="font-semibold text-white/25">&mdash;</b>
                    </li>
                  ))
                : ring.map((slice) => (
                    <li
                      key={slice.label}
                      className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5"
                    >
                      <i className="size-3 rounded-[4px]" style={{ background: slice.color }} />
                      <span className="min-w-0">{slice.label}</span>
                      <b className="font-semibold">{Math.round((slice.value / budget) * 100)}%</b>
                    </li>
                  ))}
            </ul>

            <dl className="text-[13px]">
              <div className="flex justify-between gap-3 border-t border-white/15 py-2.5">
                <dt className="text-white/70">Terpakai</dt>
                <dd className="font-bold">{formatRupiah(total)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-white/15 pt-2.5">
                <dt className="text-white/70">Program terisi</dt>
                <dd className="font-bold">
                  {terisi} dari {categories.length}
                </dd>
              </div>
            </dl>
            <p className="sr-only" aria-live="polite">
              Sisa dana {formatRupiah(sisa)}
            </p>
          </HeroCard>

          {/* Tinggi dipesan sebesar saat terisi (3 baris + catatan), supaya kartu di bawahnya tidak terdorong. */}
          <Card className="flex min-h-[284px] flex-col">
            <p className="text-[13px] text-muted">Pilihanmu dibanding APBD</p>
            {bandingan.length > 0 ? (
              <>
                <ul className="mt-2">
                  {bandingan.map((row) => (
                    <li
                      key={row.kategori}
                      className="flex items-center justify-between gap-3 border-t border-rule py-3 first:border-t-0"
                    >
                      <span className="flex min-w-0 items-center gap-3 font-medium">
                        <CategoryTile kategori={row.kategori} small />
                        <span className="min-w-0 truncate" title={row.kategori}>
                          {row.kategori}
                        </span>
                      </span>
                      <b className="flex-none whitespace-nowrap">
                        {formatSelisih(row.selisih)} poin
                      </b>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-1 text-xs text-muted">
                  Porsi APBD dihitung dari pos yang terpetakan.{' '}
                  <Link to="/metodologi" className="font-semibold text-warga underline">
                    Lihat metodologi
                  </Link>
                  .
                </p>
              </>
            ) : (
              <>
                <ul aria-hidden="true" className="mt-2">
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 border-t border-rule py-3 first:border-t-0"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <i className="block size-8 flex-none rounded-[10px] bg-active" />
                        <i
                          className="block h-2.5 rounded-full bg-active"
                          style={{ width: `${62 - i * 10}%` }}
                        />
                      </span>
                      <i className="block h-2.5 w-14 flex-none rounded-full bg-active" />
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-1 text-xs text-muted">
                  {gapQuery.isError
                    ? 'Data APBD belum bisa dimuat, jadi perbandingan belum tersedia.'
                    : 'Geser slider untuk melihat selisihnya dengan APBD.'}
                </p>
              </>
            )}
          </Card>

          {userId ? (
            <Button
              type="button"
              className="h-[52px] w-full text-[15px]"
              isLoading={saveMutation.isPending}
              disabled={!siapKirim}
              onClick={simpan}
            >
              Kirim pilihan saya
            </Button>
          ) : (
            <p className="rounded-2xl bg-mustard-pucat p-4 text-sm text-mustard-tua">
              Simulasi bisa dicoba tanpa login, tetapi mengirim pilihan butuh akun.{' '}
              <Link to="/login" className="font-semibold underline">
                Masuk dulu
              </Link>
              .
            </p>
          )}
          <p className="min-h-[59px] rounded-xl bg-active px-3 py-2.5 text-[13px] text-muted">
            {kelebihan
              ? 'Total melebihi anggaran virtual. Kurangi alokasi sampai sisa dana Rp0.'
              : siapKirim
                ? 'Siap dikirim. Satu akun, satu pilihan; bisa diubah kapan saja.'
                : 'Sisa dana harus Rp0 sebelum pilihan bisa dikirim.'}
          </p>
        </div>
      </div>

      <AllocationDetailDialog
        open={rincianBuka}
        onClose={() => setRincianBuka(false)}
        items={items}
        budget={budget}
        apbdByKategori={apbdByKategori}
        bandingkanDenganApbd={bisaMulaiDariApbd}
      />

      {saveMutation.error && (
        <ErrorState title="Gagal menyimpan alokasi" message={saveMutation.error.message} />
      )}
    </div>
  );
}
