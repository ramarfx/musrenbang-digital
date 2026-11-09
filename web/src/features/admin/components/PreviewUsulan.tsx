import type { Proposal } from '@musrenbang/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { getCategoryInfo } from '@/features/categories/info';
import { useCommentCountsQuery } from '@/features/comments/queries';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { formatAngka, formatRupiah, formatTanggal } from '@/lib/format';
import { CatatanDialog } from './CatatanDialog';
import { AnalisisAi } from './AnalisisAi';
import { umurHari } from './umurHari';
import { useModerateProposalMutation } from '../queries';

type PreviewUsulanProps = {
  proposal: Proposal;
  onClose: () => void;
  /** Dipanggil setelah usulan diputuskan, supaya daftar di belakangnya ikut menyegarkan. */
  onDecided?: () => void;
};

type AksiPreview = 'setujui' | 'tolak' | null;

/**
 * Pratinjau satu usulan untuk admin, dua kolom: keterangan dan angka di kiri, isi usulan
 * dan hasil MusrenAI di kanan. Keputusan (setujui/tolak) bisa diambil dari sini tanpa
 * pindah halaman; tautan ke halaman detail tetap tersedia untuk riwayat dan hapus.
 */
export function PreviewUsulan({ proposal, onClose, onDecided }: PreviewUsulanProps) {
  const [aksi, setAksi] = useState<AksiPreview>(null);
  const moderasi = useModerateProposalMutation();
  const jumlahKomentar = useCommentCountsQuery().data?.[proposal.id] ?? 0;
  const hari = umurHari(proposal.dibuat_pada);

  const setujui = () => {
    moderasi.mutate(
      { proposalId: proposal.id, moderasi: 'Disetujui' },
      {
        onSuccess: () => {
          toast.success('Usulan disetujui dan tampil publik.');
          onDecided?.();
          onClose();
        },
      },
    );
  };

  const kirimTolak = (catatan: string) => {
    moderasi.mutate(
      { proposalId: proposal.id, moderasi: 'Ditolak', catatan },
      {
        onSuccess: () => {
          toast.success('Usulan ditolak. Alasannya terlihat oleh pembuatnya.');
          onDecided?.();
          onClose();
        },
      },
    );
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        labelledBy="judul-pratinjau-usulan"
        className="w-[min(860px,calc(100vw-24px))]"
      >
        <div className="overflow-hidden">
          <div
            className="border-b-[1.5px] border-edge px-5 py-4 text-hitam sm:px-6"
            style={{ backgroundColor: getCategoryInfo(proposal.kategori).warna.latar }}
          >
            <div className="flex items-start gap-3">
              <CategoryTile kategori={proposal.kategori} gaya="cap" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{proposal.kategori}</p>
                <h2
                  id="judul-pratinjau-usulan"
                  className="mt-0.5 text-[22px] leading-snug font-bold tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-[26px]"
                >
                  {proposal.judul}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pratinjau"
                className="inline-flex min-h-11 min-w-11 flex-none items-center justify-center rounded-xl border border-edge bg-surface text-ink transition-colors duration-150 ease-out hover:bg-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
              >
                <Icon name="tutup" size={18} />
              </button>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            {/* Kolom kiri: keterangan dan angka. */}
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <ModerationBadge moderasi={proposal.moderasi} />
                <StatusBadge status={proposal.status} />
              </div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex-none text-muted">Pengusul</dt>
                  <dd className="text-right font-semibold [overflow-wrap:anywhere]">
                    {proposal.pengusul_nama}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex-none text-muted">Estimasi biaya</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {formatRupiah(proposal.estimasi_biaya)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex-none text-muted">Dukungan warga</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {formatAngka(proposal.jumlah_suara)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex-none text-muted">Komentar</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {formatAngka(jumlahKomentar)}
                  </dd>
                </div>
                {proposal.lokasi && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="flex-none text-muted">Lokasi</dt>
                    <dd className="text-right font-semibold [overflow-wrap:anywhere]">
                      {proposal.lokasi}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex-none text-muted">Diajukan</dt>
                  <dd className="text-right font-semibold">
                    {formatTanggal(proposal.dibuat_pada)}
                    {hari === 0 ? ', hari ini' : `, ${hari} hari lalu`}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Kolom kanan: isi usulan dan hasil MusrenAI. */}
            <div className="min-w-0 space-y-4">
              <div>
                <h3 className="font-bold">Isi usulan</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed [overflow-wrap:anywhere]">
                  {proposal.deskripsi}
                </p>
              </div>
              <AnalisisAi proposalId={proposal.id} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-rule px-5 py-4 sm:px-6">
            <Link to={`/admin/usulan/${proposal.id}`} className={buttonClass('outline', 'md')}>
              Buka halaman detail
            </Link>
            <div className="flex flex-wrap gap-2.5">
              <Button type="button" variant="outline" onClick={() => setAksi('tolak')}>
                Tolak
              </Button>
              <Button
                type="button"
                isLoading={moderasi.isPending && aksi === 'setujui'}
                onClick={() => setAksi('setujui')}
              >
                Setujui
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={aksi === 'setujui'}
        onClose={() => setAksi(null)}
        labelledBy="judul-setujui-pratinjau"
        className="w-[min(520px,calc(100vw-24px))]"
      >
        <div className="p-5 sm:p-6">
          <h2 id="judul-setujui-pratinjau" className="text-xl font-bold">
            Setujui usulan ini?
          </h2>
          <p className="mt-2 text-sm font-semibold [overflow-wrap:anywhere]">{proposal.judul}</p>
          <p className="mt-2 text-sm text-muted">
            Usulan akan tampil di halaman publik dan bisa didukung warga. Kamu masih bisa menolaknya
            nanti bila perlu.
          </p>
          {moderasi.isError && aksi === 'setujui' && (
            <div className="mt-3">
              <ErrorState title="Gagal menyetujui" message={moderasi.error.message} />
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={() => setAksi(null)}>
              Batal
            </Button>
            <Button type="button" isLoading={moderasi.isPending} onClick={setujui}>
              Setujui usulan
            </Button>
          </div>
        </div>
      </Modal>

      <CatatanDialog
        open={aksi === 'tolak'}
        onClose={() => setAksi(null)}
        judul="Tolak usulan"
        keterangan={`${proposal.judul}. Alasan ini terlihat oleh pembuat usulan di halaman Usulan saya.`}
        labelCatatan="Alasan penolakan"
        kirim="Tolak usulan"
        isPending={moderasi.isPending}
        errorMessage={moderasi.error?.message}
        onSubmit={kirimTolak}
      />
    </>
  );
}
