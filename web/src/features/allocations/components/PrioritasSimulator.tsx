import {
  ALLOCATION_STEP,
  DEFAULT_VIRTUAL_BUDGET,
  createBudgetAllocationSchema,
  totalAllocation,
} from '@musrenbang/shared';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card, HeroCard } from '@/components/ui/Card';
import { buildRingSlices, DonutRing } from '@/components/ui/DonutRing';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { useCategoriesQuery } from '@/features/categories/queries';
import { getCategoryInfo } from '@/features/categories/info';
import { useAppConfigQuery } from '@/features/config/queries';
import { useGapQuery } from '@/features/gap/queries';
import { cn } from '@/lib/cn';
import { allocateByWeights, formatSelisih } from '../lib';
import { useSaveAllocationsMutation, useUserAllocationsQuery } from '../queries';
import { PetunjukSimulator } from './PetunjukSimulator';
import { AllocationDetailDialog } from './AllocationDetailDialog';

/**
 * Simulator prioritas: warga memberi nomor 1 sampai N pada N program (1 = paling penting),
 * tiap nomor hanya sekali. Urutan diubah diam-diam jadi poin (N+1-nomor) lalu dibagi ke
 * anggaran dalam konfigurasi, jadi database, fungsi simpan, dan halaman Bandingkan tetap
 * memakai bentuk data yang sama. Rupiah tidak pernah ditampilkan ke warga.
 */
export function PrioritasSimulator({ slotAksi }: { slotAksi: HTMLElement | null }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const categoriesQuery = useCategoriesQuery();
  const configQuery = useAppConfigQuery();
  const allocationsQuery = useUserAllocationsQuery(userId);
  const gapQuery = useGapQuery();
  const saveMutation = useSaveAllocationsMutation(userId);

  // Nomor yang dipilih per program; program yang belum diberi nomor tidak ada di sini.
  const [peringkat, setPeringkat] = useState<Record<string, number>>({});
  const [rincianBuka, setRincianBuka] = useState(false);
  const navigate = useNavigate();
  const initializedRef = useRef<string | null>(null);

  const categories = useMemo(
    () => categoriesQuery.data?.map((category) => category.nama) ?? [],
    [categoriesQuery.data],
  );
  const jumlahProgram = categories.length;
  // Skala hitung di balik layar, bukan angka yang ditampilkan.
  const skala = configQuery.data?.virtualBudgetPerWarga ?? DEFAULT_VIRTUAL_BUDGET;

  // Pengguna login memuat urutan tersimpan sekali. Urutan dibaca dari besar-kecilnya angka
  // yang tersimpan, jadi urutan yang disimpan di sini kembali persis sama.
  useEffect(() => {
    if (userId === null || categories.length === 0 || !allocationsQuery.isSuccess) return;
    const identity = `${userId}:${categories.join('|')}`;
    if (initializedRef.current === identity) return;
    const tersimpan = allocationsQuery.data
      .filter((row) => row.jumlah > 0 && categories.includes(row.kategori))
      .sort((a, b) => b.jumlah - a.jumlah || a.kategori.localeCompare(b.kategori));
    setPeringkat(Object.fromEntries(tersimpan.map((row, index) => [row.kategori, index + 1])));
    initializedRef.current = identity;
  }, [userId, categories, allocationsQuery.isSuccess, allocationsQuery.data]);

  const alokasi = useMemo(() => {
    const poin = Object.fromEntries(
      categories.map((kategori) => [
        kategori,
        peringkat[kategori] ? jumlahProgram + 1 - peringkat[kategori] : 0,
      ]),
    );
    return (
      allocateByWeights(categories, poin, skala, ALLOCATION_STEP) ??
      Object.fromEntries(categories.map((kategori) => [kategori, 0]))
    );
  }, [categories, peringkat, jumlahProgram, skala]);

  const items = useMemo(
    () => categories.map((kategori) => ({ kategori, jumlah: alokasi[kategori] ?? 0 })),
    [categories, alokasi],
  );
  const total = totalAllocation(items);
  const terisi = categories.filter((kategori) => peringkat[kategori]).length;
  const lengkap = jumlahProgram > 0 && terisi === jumlahProgram;
  const persenDari = (nilai: number) => (total > 0 ? Math.round((nilai / total) * 100) : 0);

  /**
   * Memberi nomor pada satu program. Menekan nomor yang sedang dipakainya melepasnya.
   * Memilih nomor yang dipakai program lain menukar keduanya (yang lain mendapat nomor lama
   * program ini, atau tanpa nomor bila program ini belum bernomor), jadi tidak pernah ada
   * dua program dengan nomor sama.
   */
  const pilihNomor = (kategori: string, nomor: number) => {
    setPeringkat((lama) => {
      const baru = { ...lama };
      if (lama[kategori] === nomor) {
        delete baru[kategori];
        return baru;
      }
      const pemegang = categories.find((nama) => nama !== kategori && lama[nama] === nomor);
      if (pemegang) {
        if (lama[kategori]) baru[pemegang] = lama[kategori];
        else delete baru[pemegang];
      }
      baru[kategori] = nomor;
      return baru;
    });
  };

  // Porsi APBD per kategori dari v_gap. Kategori tanpa data APBD berbobot 0.
  const apbdByKategori = useMemo(
    () => Object.fromEntries((gapQuery.data ?? []).map((row) => [row.kategori, row.persen_apbd])),
    [gapQuery.data],
  );
  const bisaMulaiDariApbd = categories.some((kategori) => (apbdByKategori[kategori] ?? 0) > 0);

  /** Titik awal: urutan menurut besar APBD (terbesar nomor 1). Warga tinggal menukar. */
  const mulaiDariApbd = () => {
    const urut = [...categories].sort(
      (a, b) => (apbdByKategori[b] ?? 0) - (apbdByKategori[a] ?? 0) || a.localeCompare(b),
    );
    setPeringkat(Object.fromEntries(urut.map((kategori, index) => [kategori, index + 1])));
  };

  const ring = buildRingSlices(
    items.map((item) => ({ label: item.kategori, value: item.jumlah })),
    4,
  );
  const ringLabel =
    ring.map((slice) => `${slice.label} ${persenDari(slice.value)}%`).join(', ') ||
    'Belum ada urutan';

  // "Urutanmu dibanding APBD": 3 selisih terbesar dari program yang sudah bernomor.
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
    const validation = createBudgetAllocationSchema(skala).safeParse(items);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Urutan belum valid.');
      return;
    }
    saveMutation.mutate(validation.data, {
      onSuccess: () => navigate('/hasilmu'),
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

  const nomorList = Array.from({ length: jumlahProgram }, (_, index) => index + 1);

  return (
    <div className="stagger space-y-6">
      {slotAksi &&
        createPortal(
          <>
            {bisaMulaiDariApbd && (
              <Button type="button" variant="outline" size="sm" onClick={mulaiDariApbd}>
                Mulai dari urutan APBD
              </Button>
            )}
            <button
              type="button"
              disabled={terisi === 0}
              onClick={() => setPeringkat({})}
              className={cn(buttonClass('outline', 'sm'), 'border-edge')}
            >
              <Icon name="sampah" size={16} />
              Hapus semua nomor
            </button>
          </>,
          slotAksi,
        )}

      <PetunjukSimulator
        langkah={[
          { ikon: 'pensil', teks: 'Pilih nomor di tiap program' },
          { ikon: 'bintang', teks: `Nomor 1 paling penting, nomor ${jumlahProgram} paling tidak` },
          { ikon: 'tukar', teks: 'Nomor kembar? Dua program otomatis bertukar' },
        ]}
        ruasTerisi={Math.round((terisi / jumlahProgram) * 10)}
        keterangan={`${terisi} dari ${jumlahProgram} sudah diurutkan`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="lg:flex lg:flex-col lg:self-stretch">
          <div
            role="group"
            aria-label="Urutan prioritas per program"
            className="stagger grid auto-rows-fr gap-3.5 lg:flex-1"
          >
            {categories.map((kategori, urutan) => {
              const nomor = peringkat[kategori];
              const labelId = `urutan-${kategori}`;
              const persen = persenDari(alokasi[kategori] ?? 0);
              return (
                <div
                  key={kategori}
                  style={{ '--urutan': Math.min(urutan, 7) } as CSSProperties}
                  className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 rounded-2xl border-[1.5px] border-edge bg-surface p-3.5 shadow-[0_3px_0_var(--edge)] lg:flex-1 lg:content-center"
                >
                  <CategoryTile kategori={kategori} />
                  <span id={labelId} className="min-w-0 font-semibold">
                    <span
                      className="tanda-kategori"
                      style={{ '--tanda': getCategoryInfo(kategori).warna.latar } as CSSProperties}
                    >
                      {kategori}
                    </span>
                    <span className="block text-[13px] font-normal text-muted">
                      {getCategoryInfo(kategori).deskripsi}
                    </span>
                  </span>
                  <span className="text-right text-[13px] whitespace-nowrap text-muted">
                    {nomor ? (
                      <>
                        <b className="text-[15px] text-ink">Nomor {nomor}</b>
                        <span className="block">{persen}% bobot</span>
                      </>
                    ) : (
                      'Belum bernomor'
                    )}
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby={labelId}
                    className="col-span-full flex flex-wrap gap-1.5 sm:pl-14"
                  >
                    {nomorList.map((angka) => {
                      const aktif = nomor === angka;
                      const pemegang = categories.find(
                        (nama) => nama !== kategori && peringkat[nama] === angka,
                      );
                      return (
                        <button
                          key={angka}
                          type="button"
                          role="radio"
                          aria-checked={aktif}
                          aria-label={
                            pemegang
                              ? `Nomor ${angka}, dipakai ${pemegang}. Tekan untuk menukar.`
                              : `Nomor ${angka}`
                          }
                          title={pemegang ? `Dipakai ${pemegang}. Tekan untuk menukar.` : undefined}
                          onClick={() => pilihNomor(kategori, angka)}
                          className={cn(
                            'grid size-9 place-items-center rounded-lg border text-[13px] font-semibold tabular-nums transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                            aktif && 'border-hijau bg-hijau text-white',
                            !aktif &&
                              !pemegang &&
                              'border-border bg-surface text-ink hover:bg-active',
                            !aktif &&
                              pemegang &&
                              'border-rule bg-ground text-muted hover:bg-active',
                          )}
                        >
                          {angka}
                        </button>
                      );
                    })}
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
              aria-label="Lihat rincian urutan prioritas"
              className="mx-auto block rounded-full transition-[scale] duration-150 ease-out enabled:cursor-zoom-in enabled:hover:scale-[1.03] enabled:active:scale-[0.98]"
            >
              <DonutRing slices={ring} total={total} label={ringLabel}>
                <span className="block text-[12.5px] text-white/75">Diurutkan</span>
                <b className="block text-[19px] font-bold tracking-[-0.02em] whitespace-nowrap">
                  {terisi} dari {jumlahProgram}
                </b>
                <em className="mt-0.5 block text-[12.5px] text-mint not-italic">
                  {lengkap ? 'Lengkap' : 'Belum lengkap'}
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
                Beri nomor pada program untuk mulai.
              </p>
            )}

            {/* Tinggi legenda dipesan untuk 5 baris, supaya kartu tidak memanjang saat nomor mulai diisi. */}
            <ul className="mt-5 mb-4 flex min-h-[141.25px] flex-col gap-2.5 text-[13.5px]">
              {ring.length === 0
                ? Array.from({ length: 5 }, (_, i) => (
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
                      <b className="h-2.5 w-7 rounded-full bg-white/12" />
                    </li>
                  ))
                : ring.map((slice) => (
                    <li
                      key={slice.label}
                      className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5"
                    >
                      <i className="size-3 rounded-[4px]" style={{ background: slice.color }} />
                      <span className="min-w-0">{slice.label}</span>
                      <b className="font-semibold">{persenDari(slice.value)}%</b>
                    </li>
                  ))}
            </ul>

            <dl className="text-[13px]">
              <div className="flex justify-between gap-3 border-t border-white/15 pt-2.5">
                <dt className="text-white/70">Program diurutkan</dt>
                <dd className="font-bold">
                  {terisi} dari {jumlahProgram}
                </dd>
              </div>
            </dl>
            <p className="sr-only" aria-live="polite">
              {terisi} dari {jumlahProgram} program sudah diurutkan
            </p>
          </HeroCard>

          {/* Tinggi dipesan sebesar saat terisi (3 baris + catatan), supaya kartu di bawahnya tidak terdorong. */}
          <Card className="flex min-h-[284px] flex-col">
            <p className="text-[13px] text-muted">Urutanmu dibanding APBD</p>
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
                  Porsi APBD dihitung hanya dari kategori yang terverifikasi.{' '}
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
                    : 'Beri nomor pada program untuk melihat selisihnya dengan APBD.'}
                </p>
              </>
            )}
          </Card>

          {userId ? (
            <Button
              type="button"
              className="h-[52px] w-full text-[15px]"
              isLoading={saveMutation.isPending}
              disabled={!lengkap}
              onClick={simpan}
            >
              Kirim urutan saya
            </Button>
          ) : (
            <p className="rounded-2xl bg-mustard-pucat p-4 text-sm text-mustard-tua">
              Simulasi bisa dicoba tanpa login, tetapi mengirim urutan butuh akun.{' '}
              <Link to="/login" className="font-semibold underline">
                Masuk dulu
              </Link>
              .
            </p>
          )}
          <p className="min-h-[59px] rounded-xl bg-active px-3 py-2.5 text-[13px] text-muted">
            {lengkap
              ? 'Siap dikirim. Satu akun, satu urutan; bisa diubah kapan saja.'
              : `Beri nomor pada semua ${jumlahProgram} program sebelum urutan bisa dikirim.`}
          </p>
        </div>
      </div>

      <AllocationDetailDialog
        open={rincianBuka}
        onClose={() => setRincianBuka(false)}
        items={items}
        peringkat={peringkat}
        jumlahProgram={jumlahProgram}
        apbdByKategori={apbdByKategori}
        bandingkanDenganApbd={bisaMulaiDariApbd}
      />

      {saveMutation.error && (
        <ErrorState title="Gagal menyimpan urutan" message={saveMutation.error.message} />
      )}
    </div>
  );
}
