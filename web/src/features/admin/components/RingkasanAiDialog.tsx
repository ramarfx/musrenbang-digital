import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/PageLoader';
import { getCategoryInfo } from '@/features/categories/info';
import { formatAngka, formatPersen } from '@/lib/format';
import { getRingkasanAspirasi } from '../ai-api';

const JUDUL_ID = 'judul-ringkasan-aspirasi';

/** Satu angka besar di baris ringkasan. */
function Angka({ nilai, label }: { nilai: string; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-3">
      <p className="text-2xl leading-tight font-bold tabular-nums [overflow-wrap:anywhere]">
        {nilai}
      </p>
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  );
}

type Batang = { nama: string; nilai: number; label: string };

/** Batang per bidang, warnanya mengikuti warna bidang; panjangnya dibanding yang terbesar. */
function DaftarBatang({ judul, data }: { judul: string; data: Batang[] }) {
  const maks = Math.max(1, ...data.map((item) => item.nilai));
  return (
    <section aria-label={judul}>
      <h3 className="mb-2.5 font-bold">{judul}</h3>
      <ul className="space-y-2">
        {data.map((item) => (
          <li key={item.nama} className="flex items-center gap-3 text-[13px]">
            <span className="w-44 flex-none truncate sm:w-56">{item.nama}</span>
            <span
              className="relative h-2.5 min-w-0 flex-1 rounded-full bg-track"
              aria-hidden="true"
            >
              <i
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(item.nilai / maks) * 100}%`,
                  backgroundColor: getCategoryInfo(item.nama).warna.kuat,
                }}
              />
            </span>
            <b className="w-14 flex-none text-right tabular-nums">{item.label}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Pop-up ringkasan aspirasi warga untuk admin. Semua angka dan kalimatnya dihitung database
 * (view `v_aspiration_overview`) dari usulan yang sudah disetujui, suaranya, dan pembagian
 * anggaran warga. Tanpa AI, jadi datanya langsung ada tanpa menunggu.
 */
export function RingkasanAiDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ringkasan = useQuery({
    queryKey: ['admin', 'ringkasan-aspirasi'] as const,
    queryFn: getRingkasanAspirasi,
    enabled: open,
    staleTime: 30_000,
    retry: false,
  });
  const baris = ringkasan.data ?? [];
  const kalimat = baris[0]?.ringkasan;
  const totalUsulan = baris[0]?.total_usulan_disetujui ?? 0;
  const totalSuara = baris.reduce((jumlah, item) => jumlah + item.jumlah_suara, 0);
  const teratas = [...baris].sort(
    (a, b) => b.jumlah_usulan - a.jumlah_usulan || a.kategori.localeCompare(b.kategori),
  )[0];
  const urut = (ambil: (item: (typeof baris)[number]) => number) =>
    [...baris].sort((a, b) => ambil(b) - ambil(a) || a.kategori.localeCompare(b.kategori));

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
            Ringkasan aspirasi warga
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Dari usulan yang sudah disetujui, suaranya, dan pembagian anggaran warga. Dihitung
            langsung oleh database, tanpa AI.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Tutup
        </Button>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
        {ringkasan.isPending && open && <PageLoader label="Memuat ringkasan..." />}

        {ringkasan.isError && (
          <p role="alert" className="rounded-xl bg-active px-4 py-3 text-sm">
            {ringkasan.error.message}
          </p>
        )}

        {ringkasan.isSuccess && baris.length === 0 && (
          <p className="text-sm text-muted">Belum ada data untuk diringkas.</p>
        )}

        {ringkasan.isSuccess && baris.length > 0 && (
          <>
            {kalimat && (
              <p className="rounded-2xl border-[1.5px] border-edge bg-mint-pucat px-4 py-3.5 text-[15px] leading-relaxed text-mint-tua">
                {kalimat}
              </p>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <Angka nilai={formatAngka(totalUsulan)} label="usulan disetujui" />
              <Angka nilai={formatAngka(totalSuara)} label="suara pada usulan itu" />
              <Angka
                nilai={totalUsulan > 0 && teratas ? teratas.kategori : '-'}
                label="bidang dengan usulan terbanyak"
              />
            </div>

            <DaftarBatang
              judul="Usulan disetujui per bidang"
              data={urut((item) => item.jumlah_usulan).map((item) => ({
                nama: item.kategori,
                nilai: item.jumlah_usulan,
                label: formatAngka(item.jumlah_usulan),
              }))}
            />
            <DaftarBatang
              judul="Suara per bidang"
              data={urut((item) => item.jumlah_suara).map((item) => ({
                nama: item.kategori,
                nilai: item.jumlah_suara,
                label: formatAngka(item.jumlah_suara),
              }))}
            />
            <DaftarBatang
              judul="Porsi anggaran menurut warga"
              data={urut((item) => item.persen_alokasi).map((item) => ({
                nama: item.kategori,
                nilai: item.persen_alokasi,
                label: formatPersen(item.persen_alokasi),
              }))}
            />

            <p className="text-[13px] text-muted">
              Hanya agregat per bidang yang ditampilkan, tanpa nama warga atau judul usulan.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
