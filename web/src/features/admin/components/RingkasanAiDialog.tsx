import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { getCategoryInfo } from '@/features/categories/info';
import { cn } from '@/lib/cn';
import { getRingkasan, requestRingkasan, retryRingkasan } from '../ai-api';
import { LABEL_INDIKASI } from './labelIndikasi';

const JUDUL_ID = 'judul-ringkasan-ai';

/** Satu angka besar di baris ringkasan. */
function Angka({ nilai, label }: { nilai: number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-3">
      <p className="text-2xl font-bold tabular-nums">{nilai}</p>
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  );
}

/** Batang jumlah usulan per kategori, warnanya mengikuti warna kategori. */
function BatangKategori({ data }: { data: Record<string, number> }) {
  const urut = Object.entries(data).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const maks = Math.max(1, ...urut.map(([, jumlah]) => jumlah));
  if (urut.length === 0) return null;
  return (
    <ul className="space-y-2">
      {urut.map(([nama, jumlah]) => (
        <li key={nama} className="flex items-center gap-3 text-[13px]">
          <span className="w-44 flex-none truncate sm:w-56">{nama}</span>
          <span className="relative h-2.5 min-w-0 flex-1 rounded-full bg-track" aria-hidden="true">
            <i
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(jumlah / maks) * 100}%`,
                backgroundColor: getCategoryInfo(nama).warna.kuat,
              }}
            />
          </span>
          <b className="w-8 flex-none text-right tabular-nums">{jumlah}</b>
        </li>
      ))}
    </ul>
  );
}

/**
 * Pop-up ringkasan AI untuk admin. Angkanya dihitung database dari usulan yang menunggu dalam
 * 30 hari terakhir; tema dan keterbatasannya ditulis MusrenAI di sisi server. Meminta ringkasan
 * tidak mengubah usulan apa pun, dan keputusan tetap di tangan admin.
 */
export function RingkasanAiDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const minta = useMutation({ mutationFn: requestRingkasan });
  const { mutate, reset } = minta;
  const id = minta.data?.summary_id ?? null;

  // Dibuka: minta ringkasan; ditutup: lupakan supaya pembukaan berikutnya memeriksa data terbaru.
  useEffect(() => {
    if (open) mutate();
    else reset();
  }, [open, mutate, reset]);

  const ringkasan = useQuery({
    queryKey: ['admin', 'ringkasan-ai', id] as const,
    queryFn: () => getRingkasan(id as number),
    enabled: open && id !== null,
    retry: false,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === 'pending' || state === 'processing' ? 3000 : false;
    },
  });
  const ulang = useMutation({
    mutationFn: () => retryRingkasan(id as number),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'ringkasan-ai', id] }),
  });

  const data = ringkasan.data;
  const galat = minta.error ?? ringkasan.error;
  const menunggu =
    minta.isPending ||
    (ringkasan.isPending && id !== null) ||
    data?.state === 'pending' ||
    data?.state === 'processing';
  const stat = data?.statistics;
  const tema = data?.narrative?.themes ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={JUDUL_ID}
      className="w-[min(860px,calc(100vw-24px))]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <h2 id={JUDUL_ID} className="text-xl font-bold tracking-[-0.01em]">
            Ringkasan AI usulan
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Usulan yang menunggu dalam 30 hari terakhir. Saran AI hanya membantu pemeriksaan,
            keputusan tetap oleh admin.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Tutup
        </Button>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
        {galat && (
          <p role="alert" className="rounded-xl bg-active px-4 py-3 text-sm">
            {galat instanceof Error ? galat.message : 'Ringkasan AI belum tersedia.'}
          </p>
        )}

        {menunggu && !galat && (
          <p role="status" className="flex items-center gap-2.5 text-sm text-muted">
            <Spinner />
            {data?.state === 'processing' || data?.state === 'pending'
              ? 'MusrenAI sedang menyusun ringkasan. Halaman ini diperbarui sendiri.'
              : 'Menyiapkan ringkasan...'}
          </p>
        )}

        {stat && (
          <>
            <section aria-label="Angka ringkasan">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Angka nilai={stat.total} label="usulan diperiksa" />
                <Angka nilai={stat.analysis.analyzed ?? 0} label="sudah dianalisis AI" />
                <Angka nilai={stat.indicated} label="perlu perhatian" />
                <Angka nilai={stat.analysis.not_analyzed ?? 0} label="belum dianalisis" />
              </div>
              {data.coverage === 'sample' && (
                <p className="mt-2.5 text-[13px] text-muted">
                  Usulannya banyak, jadi tema di bawah disusun dari contoh sekitar 100 usulan yang
                  tersebar merata menurut bidang dan waktu. Angka di atas tetap menghitung semuanya.
                </p>
              )}
            </section>

            <section aria-label="Usulan per bidang">
              <h3 className="mb-2.5 font-bold">Usulan per bidang</h3>
              <BatangKategori data={stat.categories} />
            </section>
          </>
        )}

        {data?.stale && (
          <p className="rounded-xl bg-active px-4 py-3 text-sm">
            Ada usulan baru sejak ringkasan ini dibuat, jadi temanya disembunyikan. Tutup dan buka
            lagi untuk menyusun ulang.
          </p>
        )}

        {data?.state === 'completed' && !data.stale && (
          <section aria-label="Tema usulan">
            <h3 className="mb-2.5 font-bold">Yang banyak dibicarakan</h3>
            {tema.length === 0 ? (
              <p className="text-sm text-muted">Belum ada tema yang bisa dirangkum.</p>
            ) : (
              <ol className="space-y-2.5">
                {tema.map((item, index) => (
                  <li
                    key={`${index}-${item.topic}`}
                    className="rounded-2xl border-[1.5px] border-edge bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <b className="text-[15px]">{item.topic}</b>
                      <span className="text-[12px] text-muted">
                        dari {item.source_ids.length} usulan
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink/80">{item.explanation}</p>
                  </li>
                ))}
              </ol>
            )}
            {data.narrative?.limitations && (
              <p className="mt-3 text-[13px] text-muted">
                <b className="text-ink">Keterbatasan:</b> {data.narrative.limitations}
              </p>
            )}
          </section>
        )}

        {data?.state === 'failed' && (
          <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-4">
            <p className="text-sm">
              MusrenAI belum berhasil menyusun tema. Angka di atas tetap benar.
            </p>
            <Button
              type="button"
              size="sm"
              className={cn('mt-3')}
              isLoading={ulang.isPending}
              onClick={() => ulang.mutate()}
            >
              Coba lagi
            </Button>
            {ulang.isError && (
              <p role="alert" className="mt-2 text-[13px] text-red-700">
                {ulang.error instanceof Error ? ulang.error.message : 'Gagal mengulang.'}
              </p>
            )}
          </div>
        )}

        {stat && stat.indicated > 0 && (
          <p className="text-[13px] text-muted">
            "Perlu perhatian" berarti satu atau lebih indikasi:{' '}
            {['spam', 'promotion', 'irrelevant'].map((k) => LABEL_INDIKASI[k]).join(', ')}.
          </p>
        )}
      </div>
    </Modal>
  );
}
