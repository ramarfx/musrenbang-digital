import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ApbdTable } from '@/features/apbd/components/ApbdTable';
import { DokumenResmiKartu } from '@/features/apbd/components/DokumenResmiKartu';
import { useApbdQuery } from '@/features/apbd/queries';
import { statusData } from '@/features/apbd/lib';
import { useAppConfigQuery } from '@/features/config/queries';
import { formatRupiah } from '@/lib/format';

export default function Apbd() {
  const apbdQuery = useApbdQuery();
  const configQuery = useAppConfigQuery();
  const items = apbdQuery.data ?? [];
  const kota = items[0]?.kota ?? configQuery.data?.kota ?? 'DKI Jakarta';
  const tahun = items[0]?.tahun ?? configQuery.data?.tahunAnggaran ?? 2026;

  // Tiga keadaan data (kontrak backend): hanya yang terverifikasi masuk perbandingan.
  const terverifikasi = items.filter((item) => statusData(item) === 'terverifikasi');
  const belumTerverifikasi = items.filter((item) => statusData(item) === 'belum_terverifikasi');
  const kosong = items.filter((item) => statusData(item) === 'kosong');
  const totalTerverifikasi = terverifikasi.reduce((sum, item) => sum + item.nominal_rp, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`APBD ${kota} ${tahun}`}
        description="Hanya angka yang terverifikasi dan bertautan sumber yang dipakai di halaman Bandingkan. Angka lain tetap ditampilkan di sini supaya jelas statusnya, tetapi belum resmi."
      />

      {items.length > 0 && (
        <section className="stagger grid gap-3 sm:grid-cols-3" aria-label="Status data APBD">
          <Card>
            <p className="text-sm text-muted">Terverifikasi</p>
            <p className="text-2xl font-bold tabular-nums">{terverifikasi.length} kategori</p>
            <p className="mt-1 text-[13px] text-muted">
              {terverifikasi.length > 0
                ? `Total ${formatRupiah(totalTerverifikasi)}, ikut dibandingkan.`
                : 'Belum ada, jadi Bandingkan belum bisa menghitung selisih.'}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Belum terverifikasi</p>
            <p className="text-2xl font-bold tabular-nums">{belumTerverifikasi.length} kategori</p>
            <p className="mt-1 text-[13px] text-muted">
              Ada angka, tetapi bukan angka resmi dan belum ikut dibandingkan.
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Data belum ada</p>
            <p className="text-2xl font-bold tabular-nums">{kosong.length} kategori</p>
            <p className="mt-1 text-[13px] text-muted">Belum ada angka sama sekali.</p>
          </Card>
        </section>
      )}

      <Card>
        <h2 className="text-lg font-bold">Dari mana angka ini</h2>
        <ul className="mt-3 max-w-[68ch] list-disc space-y-2 pl-5 text-sm text-ink">
          <li>
            <b>Terverifikasi</b>: angkanya bertautan ke sumbernya dan telah ditandai terverifikasi
            di data. Hanya ini yang masuk perbandingan dengan pilihan warga.
          </li>
          <li>
            <b>Belum terverifikasi</b>: angka awal dari pemberitaan tentang APBD {tahun}. Belum
            dicocokkan ke lampiran resmi, jadi jangan dibaca sebagai angka resmi.
          </li>
          <li>
            <b>Data belum ada</b>: tidak dirinci di sumber yang kami punya, dan tidak dikarang.
          </li>
          <li>
            Total belanja daerah resmi Rp74.285.299.931.740, sama di Perda 4/2025 dan Pergub
            44/2025. Lampiran I Perda memuat ringkasan per jenis belanja, bukan per bidang seperti
            sepuluh kategori di sini, jadi angka per kategori masih dihimpun dari rincian program.
            Dokumen sumbernya ada di{' '}
            <Link to="/apbd#dokumen-resmi" className="font-semibold text-warga underline">
              daftar dokumen resmi
            </Link>
            .{' '}
            <Link to="/metodologi" className="font-semibold text-warga underline">
              Lihat metodologi
            </Link>
            .
          </li>
        </ul>
      </Card>

      <DokumenResmiKartu />

      {apbdQuery.isPending && <PageLoader label="Memuat data APBD..." />}

      {apbdQuery.isError && (
        <ErrorState
          message={apbdQuery.error.message}
          onRetry={() => {
            void apbdQuery.refetch();
          }}
        />
      )}

      {apbdQuery.isSuccess && items.length === 0 && (
        <EmptyState
          title="Data APBD belum tersedia"
          description="Data APBD belum tersedia atau masih dalam proses verifikasi."
        />
      )}

      {items.length > 0 && <ApbdTable items={items} />}
    </div>
  );
}
