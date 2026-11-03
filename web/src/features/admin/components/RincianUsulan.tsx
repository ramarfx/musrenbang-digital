import type { Proposal } from '@musrenbang/shared';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { formatAngka, formatRupiahRingkas, formatTanggal } from '@/lib/format';

/**
 * Rincian usulan terpilih di kolom kanan halaman admin, lengkap dengan keputusannya. Kartunya
 * ikut setinggi kolom antrean di sebelahnya, jadi dua kolom selalu sama tinggi.
 */
export function RincianUsulan({
  proposal,
  sedangDiproses,
  onSetujui,
  onTolak,
  onUbahStatus,
}: {
  proposal: Proposal | null;
  sedangDiproses: number | null;
  onSetujui: (proposal: Proposal) => void;
  onTolak: (proposal: Proposal) => void;
  onUbahStatus: (proposal: Proposal) => void;
}) {
  return (
    <Card className="flex flex-col">
      <h2 className="text-lg font-bold">Rincian usulan</h2>
      {proposal === null ? (
        <p className="mt-3 text-sm text-muted">Pilih usulan di antrean untuk melihat rinciannya.</p>
      ) : (
        <div key={proposal.id} className="anim-page mt-3 flex flex-1 flex-col">
          <div className="flex items-start gap-3">
            <CategoryTile kategori={proposal.kategori} />
            <div className="min-w-0">
              <h3 className="font-bold">
                <Link
                  to={`/usulan/${proposal.id}`}
                  className="hover:text-warga focus-visible:outline-2 focus-visible:outline-warga"
                >
                  {proposal.judul}
                </Link>
              </h3>
              <p className="text-[13px] text-muted">
                {proposal.kategori} · oleh {proposal.pengusul_nama}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ModerationBadge moderasi={proposal.moderasi} />
            <StatusBadge status={proposal.status} />
          </div>

          <p className="mt-3 text-sm whitespace-pre-line text-ink/80">{proposal.deskripsi}</p>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-3.5 text-sm">
            <div>
              <dt className="text-[12.5px] text-muted">Estimasi</dt>
              <dd className="font-semibold">{formatRupiahRingkas(proposal.estimasi_biaya)}</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-muted">Suara</dt>
              <dd className="font-semibold tabular-nums">{formatAngka(proposal.jumlah_suara)}</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-muted">Lokasi</dt>
              <dd className="font-semibold [overflow-wrap:anywhere]">
                {proposal.lokasi || 'Tanpa lokasi'}
              </dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-muted">Diajukan</dt>
              <dd className="font-semibold">{formatTanggal(proposal.dibuat_pada)}</dd>
            </div>
          </dl>

          {proposal.moderasi === 'Ditolak' && proposal.catatan_moderasi && (
            <p className="mt-4 rounded-xl bg-active px-3.5 py-2.5 text-[13px] text-ink">
              <b>Alasan penolakan:</b> {proposal.catatan_moderasi}
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-2.5 pt-5">
            {proposal.moderasi !== 'Disetujui' && (
              <Button
                type="button"
                size="sm"
                isLoading={sedangDiproses === proposal.id}
                disabled={sedangDiproses !== null}
                onClick={() => onSetujui(proposal)}
              >
                Setujui
              </Button>
            )}
            {proposal.moderasi !== 'Ditolak' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sedangDiproses !== null}
                onClick={() => onTolak(proposal)}
              >
                Tolak
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onUbahStatus(proposal)}
            >
              Ubah status
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
