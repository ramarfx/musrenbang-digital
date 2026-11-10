import type { Proposal, StatusHistory } from '@musrenbang/shared';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { KelolaFotoAdmin } from '@/features/photos/components/KelolaFotoAdmin';
import { getCategoryInfo } from '@/features/categories/info';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { formatAngka, formatRupiah, formatTanggal, formatTanggalWaktu } from '@/lib/format';
import { AnalisisAi } from './AnalisisAi';
import { KemajuanTahap } from './KemajuanTahap';
import { umurHari } from './umurHari';

type RincianUsulanProps = {
  proposal: Proposal;
  history: StatusHistory[];
  historyMemuat: boolean;
  historyGalat: boolean;
  onMuatUlangRiwayat: () => void;
  onSetujui: () => void;
  onTolak: () => void;
  onUbahStatus: () => void;
  onHapus: () => void;
};

/**
 * Isi halaman rincian admin. Semua yang dibutuhkan untuk memutuskan ada di sini: judul, isi
 * usulan, status, riwayat bercatatan, dan hasil MusrenAI. Tombol keputusan berada di panel
 * samping supaya tetap terlihat saat isi usulan dibaca.
 */
export function RincianUsulan({
  proposal,
  history,
  historyMemuat,
  historyGalat,
  onMuatUlangRiwayat,
  onSetujui,
  onTolak,
  onUbahStatus,
  onHapus,
}: RincianUsulanProps) {
  const hari = umurHari(proposal.dibuat_pada);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
      <div className="min-w-0 space-y-5">
        <Card className="overflow-hidden p-0">
          <div
            className="border-b-[1.5px] border-edge px-5 py-4 text-hitam sm:px-6"
            style={{ backgroundColor: getCategoryInfo(proposal.kategori).warna.latar }}
          >
            <div className="flex items-start gap-3">
              <CategoryTile kategori={proposal.kategori} gaya="cap" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{proposal.kategori}</p>
                <h1 className="mt-0.5 text-[22px] leading-snug font-bold tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-[26px]">
                  {proposal.judul}
                </h1>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <ModerationBadge moderasi={proposal.moderasi} />
              <StatusBadge status={proposal.status} />
            </div>
            <KemajuanTahap status={proposal.status} className="mt-3" />

            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Pengusul</dt>
                <dd className="font-semibold text-ink [overflow-wrap:anywhere]">
                  {proposal.pengusul_nama}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Diajukan</dt>
                <dd className="font-semibold text-ink">
                  {formatTanggal(proposal.dibuat_pada)}
                  {hari === 0 ? ', hari ini' : `, ${hari} hari lalu`}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Estimasi biaya</dt>
                <dd className="font-semibold text-ink">{formatRupiah(proposal.estimasi_biaya)}</dd>
              </div>
              <div>
                <dt className="text-muted">Dukungan warga</dt>
                <dd className="font-semibold text-ink">
                  {formatAngka(proposal.jumlah_suara)} suara
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Lokasi</dt>
                <dd className="font-semibold text-ink [overflow-wrap:anywhere]">
                  {proposal.lokasi || 'Tidak dicantumkan'}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Isi usulan</h2>
          <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-ink/85 [overflow-wrap:anywhere]">
            {proposal.deskripsi}
          </p>
          {proposal.catatan_moderasi && (
            <div className="mt-4 rounded-xl bg-active px-3.5 py-3 text-sm text-ink">
              <p className="font-bold">
                {proposal.moderasi === 'Ditolak' ? 'Alasan penolakan' : 'Catatan persetujuan'}
              </p>
              <p className="mt-1 [overflow-wrap:anywhere]">{proposal.catatan_moderasi}</p>
            </div>
          )}
          <KelolaFotoAdmin proposal={proposal} />
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Riwayat tahap</h2>
          <p className="mt-1 text-sm text-muted">
            Setiap perubahan tahap tercatat dengan catatan admin.
          </p>

          {historyMemuat && <p className="mt-3 text-sm text-muted">Memuat riwayat...</p>}

          {historyGalat && (
            <div className="mt-3">
              <p className="text-sm text-muted">Riwayat belum bisa dimuat.</p>
              <Button type="button" variant="outline" className="mt-2" onClick={onMuatUlangRiwayat}>
                Coba lagi
              </Button>
            </div>
          )}

          {!historyMemuat && !historyGalat && history.length === 0 && (
            <p className="mt-3 text-sm text-muted">
              Belum ada perubahan tahap. Usulan masih di tahap {proposal.status}.
            </p>
          )}

          {!historyMemuat && !historyGalat && history.length > 0 && (
            <ol className="mt-4 space-y-4">
              {history.map((item, index) => (
                <li key={item.id} className="relative pl-7">
                  {index < history.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-4 left-[5px] h-[calc(100%+8px)] w-0.5 bg-track"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 left-0 size-3 rounded-full border-2 border-surface bg-hijau-terang"
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="font-semibold">{item.status_baru}</p>
                    <p className="text-[13px] text-muted">{formatTanggalWaktu(item.diubah_pada)}</p>
                  </div>
                  <p className="text-[13px] text-muted">
                    oleh {item.diubah_oleh_nama ?? 'Sistem'}
                    {item.status_lama ? `, dari ${item.status_lama}` : ''}
                  </p>
                  {item.catatan && (
                    <p className="mt-1.5 rounded-xl bg-active px-3 py-2 text-[13.5px] text-ink [overflow-wrap:anywhere]">
                      {item.catatan}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Kolom samping memanjang sepanjang kolom isi, dan kartu keputusan bersama kartu hapus
          menempel sebagai satu kesatuan. Menempelkan satu kartu saja membuatnya menimpa kartu
          di bawahnya saat halaman digulir. */}
      <aside className="space-y-5 lg:self-stretch">
        <AnalisisAi proposalId={proposal.id} />

        <div className="space-y-5 lg:sticky lg:top-6">
          <Card>
            <h2 className="text-lg font-bold">Keputusan admin</h2>
            <p className="mt-1 text-sm text-muted">Status persetujuan saat ini:</p>
            <div className="mt-2">
              <ModerationBadge moderasi={proposal.moderasi} />
            </div>

            <div className="mt-4 grid gap-2.5">
              {proposal.moderasi !== 'Disetujui' && (
                <Button type="button" onClick={onSetujui}>
                  Setujui usulan
                </Button>
              )}
              {proposal.moderasi !== 'Ditolak' && (
                <Button type="button" variant="outline" onClick={onTolak}>
                  Tolak usulan
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onUbahStatus}>
                Ubah tahap
              </Button>
              <Link to={`/usulan/${proposal.id}`} className={buttonClass('ghost', 'md')}>
                Lihat tampilan publik
              </Link>
            </div>

            <p className="mt-3 text-[13px] text-muted">
              Penolakan wajib memakai alasan. Perubahan tahap wajib memakai catatan yang masuk ke
              riwayat publik.
            </p>
          </Card>

          <Card>
            <h2 className="text-base font-bold">Hapus usulan</h2>
            <p className="mt-1 text-sm text-muted">
              Usulan beserta dukungan, komentar, dan riwayat tahapnya hilang permanen.
            </p>
            <Button type="button" variant="danger-outline" className="mt-3" onClick={onHapus}>
              Hapus usulan
            </Button>
          </Card>
        </div>
      </aside>
    </div>
  );
}
