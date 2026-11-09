import {
  ALLOCATION_STEP,
  DEFAULT_VIRTUAL_BUDGET,
  createBudgetAllocationSchema,
} from '@musrenbang/shared';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { getCategoryInfo } from '@/features/categories/info';
import { useCategoriesQuery } from '@/features/categories/queries';
import { useAppConfigQuery } from '@/features/config/queries';
import { arahSelisih, siapkanGap } from '@/features/gap/lib';
import { useGapQuery } from '@/features/gap/queries';
import { cn } from '@/lib/cn';
import { formatPersen } from '@/lib/format';
import { formatSelisih } from '@/lib/selisih';
import {
  BATAS_MAKS_PILIHAN,
  BATAS_PILIHAN,
  JUMLAH_KOIN,
  PERSEN_PER_KOIN,
  bagiRata,
  koinKeAlokasi,
  muatDariAlokasi,
  sisaKoin,
  ubahKoin,
  type Koin,
} from '../koin';
import { useSaveAllocationsMutation, useUserAllocationsQuery } from '../queries';

type Langkah = 0 | 1 | 2;

const NAMA_LANGKAH = ['Pilih prioritas', 'Bagi koin', 'Lihat hasil'] as const;

/** Tiga langkah: yang sudah lewat bertinta, yang sedang berjalan distabilo. */
function PetaLangkah({ langkah }: { langkah: Langkah }) {
  return (
    <ol className="flex gap-2" aria-label="Langkah simulator">
      {NAMA_LANGKAH.map((nama, index) => {
        const lewat = index < langkah;
        const kini = index === langkah;
        return (
          <li
            key={nama}
            aria-current={kini ? 'step' : undefined}
            className={cn(
              'flex min-w-0 items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-[13px] font-semibold transition-colors duration-200 motion-reduce:transition-none sm:flex-1 sm:text-sm',
              kini ? 'flex-1' : 'flex-none',
              kini && 'border-edge bg-hijau-terang text-hitam',
              lewat && 'border-edge bg-ink text-on-ink',
              !kini && !lewat && 'border-rule bg-surface text-muted',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-6 flex-none place-items-center rounded-full border-2 text-[11px] font-bold',
                kini && 'border-hitam',
                lewat && 'border-hijau-terang bg-hijau-terang text-hitam',
                !kini && !lewat && 'border-mati',
              )}
            >
              {lewat ? (
                <svg
                  viewBox="0 0 24 24"
                  width={13}
                  height={13}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span className={cn('min-w-0 truncate', !kini && 'sr-only sm:not-sr-only')}>
              {nama}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Nama bidang dengan tanda stabilo sesuai warna bidangnya, sama dengan daftar di halaman lain. */
function NamaBidang({ kategori }: { kategori: string }) {
  return (
    <span
      className="tanda-kategori"
      style={{ '--tanda': getCategoryInfo(kategori).warna.latar } as CSSProperties}
    >
      {kategori}
    </span>
  );
}

/** Satu batang persentase: hijau untuk pilihanmu, tinta untuk APBD. */
function BatangPersen({
  label,
  persen,
  skala,
  warna,
}: {
  label: string;
  persen: number;
  skala: number;
  warna: string;
}) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="w-11 flex-none text-muted">{label}</span>
      <div className="relative h-2.5 min-w-0 flex-1 rounded-full bg-track" aria-hidden="true">
        <i
          className={cn('absolute inset-y-0 left-0 rounded-full', warna)}
          style={{ width: `${Math.min(100, (persen / skala) * 100)}%` }}
        />
      </div>
      <b className="w-14 flex-none text-right font-semibold tabular-nums">{formatPersen(persen)}</b>
    </div>
  );
}

/** Deret koin: yang terisi hijau, yang kosong abu. */
function DeretKoin({ isi, total = JUMLAH_KOIN }: { isi: number; total?: number }) {
  return (
    <span aria-hidden="true" className="flex flex-wrap gap-1">
      {Array.from({ length: total }, (_, index) => (
        <i
          key={index}
          className={cn(
            'size-3.5 rounded-full border-[1.5px] transition-colors duration-150 motion-reduce:transition-none',
            index < isi ? 'border-edge bg-hijau-terang' : 'border-rule bg-track',
          )}
        />
      ))}
    </span>
  );
}

/**
 * Simulator dalam tiga langkah: pilih minimal 3 bidang, bagi 10 koin di antaranya
 * (satu koin 10%), lalu lihat bedanya dengan APBD. Disimpan ke tabel alokasi yang sama dengan
 * sebelumnya: bidang pilihan berisi anggaran virtual terbagi sesuai koin, bidang lain nol.
 */
export function SimulatorAlur() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();
  const categoriesQuery = useCategoriesQuery();
  const configQuery = useAppConfigQuery();
  const allocationsQuery = useUserAllocationsQuery(userId);
  const gapQuery = useGapQuery();
  const saveMutation = useSaveAllocationsMutation(userId);

  const [langkah, setLangkah] = useState<Langkah>(0);
  const [pilihan, setPilihan] = useState<string[]>([]);
  const [koin, setKoin] = useState<Koin>({});
  const [pesan, setPesan] = useState('');
  const dimuatRef = useRef<string | null>(null);

  const categories = useMemo(
    () => categoriesQuery.data?.map((kategori) => kategori.nama) ?? [],
    [categoriesQuery.data],
  );
  const anggaran = configQuery.data?.virtualBudgetPerWarga ?? DEFAULT_VIRTUAL_BUDGET;
  const ringkasan = useMemo(
    () => siapkanGap(gapQuery.data ?? [], categories),
    [gapQuery.data, categories],
  );
  const baris = useMemo(
    () => new Map(ringkasan.rows.map((row) => [row.kategori, row])),
    [ringkasan],
  );

  // Pilihan tersimpan dimuat sekali per pengguna, supaya perubahan yang sedang dibuat tidak tertimpa.
  useEffect(() => {
    if (userId === null || categories.length === 0 || !allocationsQuery.isSuccess) return;
    const identitas = `${userId}:${categories.join('|')}`;
    if (dimuatRef.current === identitas) return;
    dimuatRef.current = identitas;
    const muat = muatDariAlokasi(allocationsQuery.data, categories);
    if (muat) {
      setPilihan(muat.pilihan);
      setKoin(muat.koin);
    }
  }, [userId, categories, allocationsQuery.isSuccess, allocationsQuery.data]);

  const sisa = sisaKoin(koin);

  const ketuk = (kategori: string) => {
    setPesan('');
    if (pilihan.includes(kategori)) {
      setPilihan((lama) => lama.filter((nama) => nama !== kategori));
      setKoin(({ [kategori]: _dibuang, ...sisanya }) => sisanya);
      return;
    }
    if (pilihan.length >= BATAS_MAKS_PILIHAN) {
      setPesan('Semua bidang sudah dipilih.');
      return;
    }
    setPilihan((lama) => [...lama, kategori]);
    setKoin({});
  };

  const keLangkahKoin = () => {
    // Pembagian awal rata; pilihan tersimpan yang tidak berubah dipertahankan.
    const sudahSesuai = pilihan.every((nama) => koin[nama] !== undefined) && sisaKoin(koin) === 0;
    if (!sudahSesuai) setKoin(bagiRata(pilihan));
    setLangkah(1);
  };

  const simpan = () => {
    const items = koinKeAlokasi(categories, koin, anggaran, ALLOCATION_STEP);
    const validasi = createBudgetAllocationSchema(anggaran).safeParse(items);
    if (!validasi.success) {
      toast.error(validasi.error.issues[0]?.message ?? 'Pilihanmu belum valid.');
      return;
    }
    saveMutation.mutate(validasi.data, {
      onSuccess: () => navigate('/hasilmu'),
      onError: (error) => toast.error(error.message),
    });
  };

  if (categoriesQuery.isPending || configQuery.isPending) {
    return <Skeleton className="h-[560px] w-full rounded-3xl" />;
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

  const cukup = pilihan.length >= BATAS_PILIHAN;
  const hasil = pilihan.map((kategori) => {
    const row = baris.get(kategori);
    const kamu = (koin[kategori] ?? 0) * PERSEN_PER_KOIN;
    const apbd = row?.adaApbd ? row.persen_apbd : null;
    return { kategori, kamu, apbd, selisih: apbd === null ? null : kamu - apbd };
  });
  const skala = Math.max(1, ...hasil.flatMap((item) => [item.kamu, item.apbd ?? 0]));
  const terjauh = [...hasil]
    .filter((item) => item.selisih !== null)
    .sort((a, b) => Math.abs(b.selisih ?? 0) - Math.abs(a.selisih ?? 0))[0];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PetaLangkah langkah={langkah} />

      {langkah === 0 && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.01em] sm:text-2xl">
              Dari semua ini, mana yang paling penting?
            </h2>
            <p className="mt-1.5 max-w-[60ch] text-[15px] text-muted">
              Ketuk untuk memilih. Pilih minimal {BATAS_PILIHAN} bidang yang paling mendesak di
              lingkunganmu. Boleh lebih dari {BATAS_PILIHAN} sampai semua bidang terpilih. Nomornya
              mengikuti urutan ketukanmu.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-active px-4 py-3">
            <b className="text-[15px]">
              Sudah dipilih: {pilihan.length} (minimal {BATAS_PILIHAN})
            </b>
            <DeretKoin isi={pilihan.length} total={BATAS_MAKS_PILIHAN} />
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((kategori) => {
              const urutan = pilihan.indexOf(kategori);
              const dipilih = urutan >= 0;
              return (
                <li key={kategori} className="flex">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={dipilih}
                    onClick={() => ketuk(kategori)}
                    className={cn(
                      'relative flex min-h-[148px] w-full flex-col gap-3 rounded-2xl border-[1.5px] border-edge p-3.5 text-left shadow-[0_3px_0_var(--edge)] transition-[translate,box-shadow,background-color,opacity] duration-150 ease-out motion-reduce:transition-none active:translate-y-0.5 active:shadow-[0_1px_0_var(--edge)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                      dipilih ? 'bg-mint-pucat' : 'bg-surface hover:bg-active',
                      !dipilih && pilihan.length >= BATAS_MAKS_PILIHAN && 'opacity-60',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <CategoryTile kategori={kategori} gaya="cap" />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid size-7 place-items-center rounded-full border-2 text-[13px] font-bold tabular-nums',
                          dipilih ? 'border-edge bg-ink text-on-ink' : 'border-mati',
                        )}
                      >
                        {dipilih ? urutan + 1 : ''}
                      </span>
                    </span>
                    <span className="min-w-0 font-semibold">
                      <NamaBidang kategori={kategori} />
                      <span className="mt-1.5 block text-[13px] font-normal text-muted">
                        {getCategoryInfo(kategori).deskripsi}
                      </span>
                    </span>
                    <span className="sr-only">{dipilih ? `, prioritas ${urutan + 1}` : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="min-h-5 text-[13px] text-muted" role="status" aria-live="polite">
            {pesan ||
              (cukup
                ? 'Sudah cukup. Lanjut untuk membagi koinmu.'
                : `Pilih ${BATAS_PILIHAN - pilihan.length} bidang lagi.`)}
          </p>
          <Button
            type="button"
            className="h-[52px] w-full text-[15px]"
            disabled={!cukup}
            onClick={keLangkahKoin}
          >
            Lanjut: bagi koin
          </Button>
        </Card>
      )}

      {langkah === 1 && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.01em] sm:text-2xl">Bagi 10 koinmu</h2>
            <p className="mt-1.5 max-w-[60ch] text-[15px] text-muted">
              Satu koin sama dengan {PERSEN_PER_KOIN}% pilihanmu. Koin sudah dibagi rata, ubah
              sesukamu. Mau memindahkan koin? Kurangi satu baris dulu, lalu tambahkan di baris lain.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-active px-4 py-3">
            <b className="text-[15px]" role="status" aria-live="polite">
              Sisa {sisa} koin
            </b>
            <DeretKoin isi={JUMLAH_KOIN - sisa} />
          </div>

          <ul>
            {pilihan.map((kategori) => {
              const nilai = koin[kategori] ?? 0;
              return (
                <li
                  key={kategori}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-rule py-4 first:border-t-0"
                >
                  <CategoryTile kategori={kategori} gaya="cap" />
                  <span className="min-w-0">
                    <b className="block font-semibold">
                      <NamaBidang kategori={kategori} />
                    </b>
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Kurangi koin ${kategori}`}
                      disabled={nilai === 0}
                      onClick={() => setKoin((lama) => ubahKoin(lama, kategori, -1))}
                      className="grid size-10 place-items-center rounded-xl border-[1.5px] border-edge bg-surface text-xl font-bold transition-[scale,background-color,opacity] duration-150 ease-out hover:bg-active active:scale-[0.94] disabled:opacity-40 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                    >
                      -
                    </button>
                    <span className="w-16 text-center leading-tight">
                      <b className="block text-lg tabular-nums">{nilai}</b>
                      <span className="block text-xs text-muted tabular-nums">
                        {nilai * PERSEN_PER_KOIN}%
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Tambah koin ${kategori}`}
                      disabled={sisa === 0}
                      onClick={() => setKoin((lama) => ubahKoin(lama, kategori, 1))}
                      className="grid size-10 place-items-center rounded-xl border-[1.5px] border-edge bg-ink text-xl font-bold text-on-ink transition-[scale,opacity] duration-150 ease-out active:scale-[0.94] disabled:opacity-40 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                    >
                      +
                    </button>
                  </span>
                  <span className="col-span-full sm:col-span-2 sm:col-start-2">
                    <DeretKoin isi={nilai} />
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="min-h-5 text-[13px] text-muted">
            {sisa === 0
              ? 'Semua koin sudah terbagi.'
              : `Bagikan ${sisa} koin lagi untuk melihat hasilnya.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-[52px] px-6"
              onClick={() => setLangkah(0)}
            >
              Kembali
            </Button>
            <Button
              type="button"
              className="h-[52px] flex-1 text-[15px]"
              disabled={sisa !== 0}
              onClick={() => setLangkah(2)}
            >
              Lihat hasil
            </Button>
          </div>
        </Card>
      )}

      {langkah === 2 && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.01em] sm:text-2xl">
              Pilihanmu dibanding APBD
            </h2>
            <p className="mt-1.5 max-w-[60ch] text-[15px] text-muted">
              {terjauh
                ? `Paling jauh: ${terjauh.kategori}. Kamu menaruh ${formatPersen(terjauh.kamu)}, APBD ${formatPersen(terjauh.apbd ?? 0)}.`
                : 'Data APBD untuk bidang pilihanmu belum terverifikasi, jadi belum ada yang dibandingkan.'}
            </p>
          </div>

          <ul>
            {hasil.map((item) => {
              const arah = item.selisih === null ? null : arahSelisih(item.selisih);
              return (
                <li key={item.kategori} className="border-t border-rule py-4 first:border-t-0">
                  <div className="flex items-center gap-3">
                    <CategoryTile kategori={item.kategori} gaya="cap" />
                    <b className="min-w-0 flex-1 font-semibold">
                      <NamaBidang kategori={item.kategori} />
                    </b>
                    {arah && (
                      <span
                        className="tanda-status flex-none"
                        style={{ '--tanda': arah.warna } as CSSProperties}
                      >
                        {arah.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-1.5 sm:pl-[3.75rem]">
                    <BatangPersen label="Kamu" persen={item.kamu} skala={skala} warna="bg-warga" />
                    {item.apbd !== null ? (
                      <BatangPersen label="APBD" persen={item.apbd} skala={skala} warna="bg-apbd" />
                    ) : (
                      <p className="text-[13px] text-muted">
                        Data APBD bidang ini belum terverifikasi.
                      </p>
                    )}
                    {item.selisih !== null && (
                      <p className="text-[12.5px] text-muted">
                        <b className="font-semibold text-ink">{formatSelisih(item.selisih)} poin</b>
                        {item.selisih >= 0
                          ? ', kamu ingin porsinya lebih besar dari APBD'
                          : ', kamu ingin porsinya lebih kecil dari APBD'}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-muted">
            Porsimu dihitung dari 10 koin di bidang-bidang pilihamu, bidang lain nol. Porsi APBD
            hanya dari kategori yang terverifikasi.{' '}
            <Link to="/metodologi" className="font-semibold text-warga underline">
              Lihat metodologi
            </Link>
            .
          </p>

          {userId === null && (
            <p className="rounded-2xl bg-mustard-pucat p-4 text-sm text-mustard-tua">
              Simulasi bisa dicoba tanpa login, tetapi mengirim pilihan butuh akun.{' '}
              <Link to="/login" className="font-semibold underline">
                Masuk dulu
              </Link>
              .
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-[52px] px-6"
              onClick={() => setLangkah(1)}
            >
              Ubah koin
            </Button>
            {userId !== null && (
              <Button
                type="button"
                className="h-[52px] flex-1 text-[15px]"
                isLoading={saveMutation.isPending}
                onClick={simpan}
              >
                Kirim pilihanku
              </Button>
            )}
          </div>
          {saveMutation.error && (
            <ErrorState title="Gagal menyimpan pilihan" message={saveMutation.error.message} />
          )}
        </Card>
      )}
    </div>
  );
}
