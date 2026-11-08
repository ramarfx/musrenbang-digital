import type { Proposal } from '@musrenbang/shared';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { getCategoryInfo } from '@/features/categories/info';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { formatAngka, formatRupiahRingkas, formatTanggal } from '@/lib/format';
import { AnalisisAi } from './AnalisisAi';

/** Satu kotak angka bercap kecil di kartu rincian. */
function Kotak({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="min-w-0 rounded-xl border-[1.5px] border-edge bg-surface px-3 py-2">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="truncate text-sm font-bold">{nilai}</dd>
    </div>
  );
}

/**
 * Rincian usulan terpilih di kolom kanan halaman admin: pita berwarna kategori di atas, lalu
 * deskripsi, empat kotak angka, lalu hasil MusrenAI tepat di atas tombol keputusan. Kartu tumbuh
 * mengikuti isinya, jadi tidak ada area yang harus digulir di dalam kartu: yang menggulir halaman.
 */
export function RincianUsulan({
  proposal,
  sedangDiproses,
  onSetujui,
  onTolak,
  onUbahStatus,
  onHapus,
}: {
  proposal: Proposal | null;
  sedangDiproses: number | null;
  onSetujui: (proposal: Proposal) => void;
  onTolak: (proposal: Proposal) => void;
  onUbahStatus: (proposal: Proposal) => void;
  onHapus: (proposal: Proposal) => void;
}) {
  return (
    <section
      aria-label="Rincian usulan"
      className="kartu-cap flex flex-col overflow-hidden rounded-3xl bg-surface lg:min-h-[600px]"
    >
      {proposal === null ? (
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold">Rincian usulan</h2>
          <p className="mt-3 text-sm text-muted">
            Pilih usulan di antrean untuk melihat rinciannya.
          </p>
        </div>
      ) : (
        <div key={proposal.id} className="anim-page flex min-h-0 flex-1 flex-col">
          <div
            className="flex items-center gap-3 border-b-[1.5px] border-edge px-5 py-3.5 sm:px-6"
            style={{ backgroundColor: getCategoryInfo(proposal.kategori).warna.latar }}
          >
            <CategoryTile kategori={proposal.kategori} />
            <div className="min-w-0">
              <h2 className="font-bold [overflow-wrap:anywhere]">
                <Link
                  to={`/usulan/${proposal.id}`}
                  className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge"
                >
                  {proposal.judul}
                </Link>
              </h2>
              <p className="text-[13px] text-ink/75">
                {proposal.kategori} · oleh {proposal.pengusul_nama}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 pb-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <ModerationBadge moderasi={proposal.moderasi} />
              <StatusBadge status={proposal.status} />
            </div>

            <div className="mt-3 flex-1">
              <p className="text-sm whitespace-pre-line text-ink/80 [overflow-wrap:anywhere]">
                {proposal.deskripsi}
              </p>
              {proposal.moderasi === 'Ditolak' && proposal.catatan_moderasi && (
                <p className="mt-4 rounded-xl bg-active px-3.5 py-2.5 text-[13px] text-ink [overflow-wrap:anywhere]">
                  <b>Alasan penolakan:</b> {proposal.catatan_moderasi}
                </p>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2.5">
              <Kotak label="Estimasi" nilai={formatRupiahRingkas(proposal.estimasi_biaya)} />
              <Kotak label="Suara" nilai={formatAngka(proposal.jumlah_suara)} />
              <Kotak label="Lokasi" nilai={proposal.lokasi || 'Tanpa lokasi'} />
              <Kotak label="Diajukan" nilai={formatTanggal(proposal.dibuat_pada)} />
            </dl>

            <AnalisisAi proposalId={proposal.id} />

            <div className="flex flex-wrap gap-2.5 pt-4">
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sedangDiproses !== null}
                onClick={() => onHapus(proposal)}
                className="ml-auto hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
