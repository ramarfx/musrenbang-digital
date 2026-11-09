import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
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

type Halaman = { judul: string; isi: ReactNode };

/**
 * Isi pop-up dibagi per halaman yang digeser kiri-kanan, jadi tidak perlu scroll. Panah, tab
 * nama halaman, dan tombol panah keyboard sama-sama bisa dipakai.
 */
function GeserHalaman({ halaman }: { halaman: Halaman[] }) {
  const [aktif, setAktif] = useState(0);
  const terakhir = halaman.length - 1;
  const ke = (i: number) => setAktif(Math.min(terakhir, Math.max(0, i)));

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') ke(aktif + 1);
        if (e.key === 'ArrowLeft') ke(aktif - 1);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Bagian ringkasan" className="flex flex-wrap gap-1.5">
          {halaman.map((h, i) => (
            <button
              key={h.judul}
              type="button"
              role="tab"
              aria-selected={i === aktif}
              onClick={() => ke(i)}
              className={`rounded-full border-[1.5px] px-3 py-1 text-[13px] font-semibold transition-colors ${
                i === aktif
                  ? 'border-edge bg-hitam text-surface'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {h.judul}
            </button>
          ))}
        </div>
        <div className="flex flex-none items-center gap-2">
          <span className="text-[13px] text-muted tabular-nums">
            {aktif + 1}/{halaman.length}
          </span>
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={aktif === 0}
            onClick={() => ke(aktif - 1)}
            className="grid size-9 place-items-center rounded-full border-[1.5px] border-edge bg-surface text-lg font-bold disabled:opacity-35"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Halaman berikutnya"
            disabled={aktif === terakhir}
            onClick={() => ke(aktif + 1)}
            className="grid size-9 place-items-center rounded-full border-[1.5px] border-edge bg-surface text-lg font-bold disabled:opacity-35"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${aktif * 100}%)` }}
        >
          {halaman.map((h, i) => (
            <div
              key={h.judul}
              role="tabpanel"
              aria-label={h.judul}
              inert={i !== aktif}
              className="w-full flex-none px-0.5"
            >
              {h.isi}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Kartu ringkasan di paling atas halaman admin: kalimat ringkasan langsung terbaca, plus tiga
 * bidang dengan usulan disetujui terbanyak. Rincian lengkap ada di pop-up.
 */
export function RingkasanAspirasiKartu({ onBuka }: { onBuka: () => void }) {
  const ringkasan = useQuery({
    queryKey: ['admin', 'ringkasan-aspirasi'] as const,
    queryFn: getRingkasanAspirasi,
    staleTime: 30_000,
    retry: false,
  });
  const baris = ringkasan.data ?? [];
  const kalimat = baris[0]?.ringkasan;
  const totalUsulan = baris[0]?.total_usulan_disetujui ?? 0;
  const totalSuara = baris.reduce((jumlah, item) => jumlah + item.jumlah_suara, 0);
  const danaTerbesar = [...baris].sort((x, y) => y.persen_alokasi - x.persen_alokasi)[0];

  return (
    <section
      aria-labelledby="judul-ringkasan-kartu"
      className="kartu-cap rounded-3xl bg-surface px-5 py-5 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="judul-ringkasan-kartu" className="text-lg font-bold">
          Ringkasan aspirasi warga
        </h2>
        <Button type="button" size="sm" onClick={onBuka}>
          Lihat rincian
        </Button>
      </div>

      {ringkasan.isPending ? (
        <p className="mt-3 text-sm text-muted">Memuat ringkasan...</p>
      ) : ringkasan.isError ? (
        <p role="alert" className="mt-3 text-sm text-muted">
          Ringkasan belum bisa dimuat: {ringkasan.error.message}
        </p>
      ) : (
        <>
          <dl className="mt-4 grid gap-y-3 sm:grid-cols-3">
            <div className="flex flex-col-reverse sm:pr-5">
              <dt className="text-[13px] text-muted">usulan disetujui</dt>
              <dd className="text-[34px] leading-tight font-extrabold tracking-[-0.03em] tabular-nums">
                {formatAngka(totalUsulan)}
              </dd>
            </div>
            <div className="flex flex-col-reverse border-t border-rule pt-3 sm:border-t-0 sm:border-l-[1.5px] sm:border-edge sm:px-5 sm:pt-0">
              <dt className="text-[13px] text-muted">suara pada usulan itu</dt>
              <dd className="text-[34px] leading-tight font-extrabold tracking-[-0.03em] tabular-nums">
                {formatAngka(totalSuara)}
              </dd>
            </div>
            <div className="flex flex-col-reverse border-t border-rule pt-3 sm:border-t-0 sm:border-l-[1.5px] sm:border-edge sm:pt-0 sm:pl-5">
              <dt className="text-[13px] text-muted">
                dana terbesar{danaTerbesar ? `, ${danaTerbesar.kategori}` : ''}
              </dt>
              <dd className="text-[34px] leading-tight font-extrabold tracking-[-0.03em] text-mint-tua tabular-nums">
                {danaTerbesar ? formatPersen(danaTerbesar.persen_alokasi) : '-'}
              </dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-rule pt-4 text-[15.5px] leading-relaxed">
            {kalimat ?? 'Belum ada usulan disetujui untuk diringkas.'}
          </p>
        </>
      )}
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
          <GeserHalaman
            halaman={[
              {
                judul: 'Ringkasan',
                isi: (
                  <div className="space-y-4">
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
                    <p className="text-[13px] text-muted">
                      Hanya agregat per bidang yang ditampilkan, tanpa nama warga atau judul usulan.
                    </p>
                  </div>
                ),
              },
              {
                judul: 'Usulan',
                isi: (
                  <DaftarBatang
                    judul="Usulan disetujui per bidang"
                    data={urut((item) => item.jumlah_usulan).map((item) => ({
                      nama: item.kategori,
                      nilai: item.jumlah_usulan,
                      label: formatAngka(item.jumlah_usulan),
                    }))}
                  />
                ),
              },
              {
                judul: 'Suara',
                isi: (
                  <DaftarBatang
                    judul="Suara per bidang"
                    data={urut((item) => item.jumlah_suara).map((item) => ({
                      nama: item.kategori,
                      nilai: item.jumlah_suara,
                      label: formatAngka(item.jumlah_suara),
                    }))}
                  />
                ),
              },
              {
                judul: 'Anggaran',
                isi: (
                  <DaftarBatang
                    judul="Porsi anggaran menurut warga"
                    data={urut((item) => item.persen_alokasi).map((item) => ({
                      nama: item.kategori,
                      nilai: item.persen_alokasi,
                      label: formatPersen(item.persen_alokasi),
                    }))}
                  />
                ),
              },
            ]}
          />
        )}
      </div>
    </Modal>
  );
}
