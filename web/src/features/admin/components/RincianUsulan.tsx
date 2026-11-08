import type { Proposal } from '@musrenbang/shared';
import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { getCategoryInfo } from '@/features/categories/info';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { formatAngka, formatRupiahRingkas, formatTanggal } from '@/lib/format';
import { AnalisisAi } from './AnalisisAi';

/**
 * Rincian usulan terpilih di kartu kanan halaman admin. Kepalanya berwarna kategori, sama
 * dengan baris yang dipilih di antrean. Saat baris diklik, isinya tumbuh dari titik setinggi
 * baris itu, supaya terlihat bahwa kartu ini adalah isi baris tersebut. Hasil MusrenAI ada di
 * atas, tombol keputusan menempel di dasar kartu.
 */
export function RincianUsulan({
  proposal,
  asalY,
  sedangDiproses,
  onSetujui,
  onTolak,
  onUbahStatus,
  onHapus,
}: {
  proposal: Proposal | null;
  /** Posisi tengah baris yang diklik di layar; kosong saat dipilih otomatis. */
  asalY: number | null;
  sedangDiproses: number | null;
  onSetujui: (proposal: Proposal) => void;
  onTolak: (proposal: Proposal) => void;
  onUbahStatus: (proposal: Proposal) => void;
  onHapus: (proposal: Proposal) => void;
}) {
  const isiRef = useRef<HTMLDivElement>(null);
  const id = proposal?.id;

  useLayoutEffect(() => {
    const isi = isiRef.current;
    if (!isi || asalY === null) return;
    const kurangi = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Tumbuh dari baris hanya saat antrean dan rincian berdampingan (layar lebar).
    const berdampingan = window.matchMedia('(min-width: 1024px)').matches;
    if (kurangi || !berdampingan) {
      isi.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      return;
    }
    const kotak = isi.getBoundingClientRect();
    const y = Math.min(Math.max(asalY - kotak.top, 0), kotak.height);
    isi.style.transformOrigin = `0 ${y}px`;
    isi.animate(
      [
        { transform: 'scale(0.92)', opacity: 0.2 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
  }, [id, asalY]);

  return (
    <section
      aria-label="Rincian usulan"
      className="kartu-cap flex min-h-0 flex-col overflow-hidden rounded-3xl bg-surface"
    >
      {proposal === null ? (
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold">Rincian usulan</h2>
          <p className="mt-3 text-sm text-muted">
            Pilih usulan di antrean untuk melihat rinciannya.
          </p>
        </div>
      ) : (
        <div ref={isiRef} className="flex min-h-0 flex-1 flex-col">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-4 sm:px-6">
            <AnalisisAi proposalId={proposal.id} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ModerationBadge moderasi={proposal.moderasi} />
              <StatusBadge status={proposal.status} />
            </div>
            <p className="mt-3 text-sm whitespace-pre-line text-ink/80 [overflow-wrap:anywhere]">
              {proposal.deskripsi}
            </p>
            {proposal.moderasi === 'Ditolak' && proposal.catatan_moderasi && (
              <p className="mt-3 rounded-xl bg-active px-3.5 py-2.5 text-[13px] text-ink [overflow-wrap:anywhere]">
                <b>Alasan penolakan:</b> {proposal.catatan_moderasi}
              </p>
            )}
            <p className="mt-2.5 text-[13px] text-muted [overflow-wrap:anywhere]">
              <b className="text-ink">{formatRupiahRingkas(proposal.estimasi_biaya)}</b> ·{' '}
              {formatAngka(proposal.jumlah_suara)} suara · {proposal.lokasi || 'Tanpa lokasi'} ·
              diajukan {formatTanggal(proposal.dibuat_pada)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 border-t-[1.5px] border-border px-5 py-3.5 sm:px-6">
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
              className="ml-auto"
              onClick={() => onUbahStatus(proposal)}
            >
              Ubah status
            </Button>
            <button
              type="button"
              aria-label="Hapus usulan"
              title="Hapus usulan"
              disabled={sedangDiproses !== null}
              onClick={() => onHapus(proposal)}
              className="inline-flex size-9 flex-none items-center justify-center rounded-xl border border-edge bg-surface text-ink transition-[scale,background-color,color,border-color] duration-150 ease-out hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="sampah" size={17} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
