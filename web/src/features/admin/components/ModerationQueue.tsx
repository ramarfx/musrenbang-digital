import {
  PROPOSAL_MODERATION_STATUSES,
  type Proposal,
  type ProposalModeration,
} from '@musrenbang/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { cn } from '@/lib/cn';
import { formatRupiahRingkas, formatTanggal } from '@/lib/format';

type ModerationQueueProps = {
  proposals: Proposal[];
  /** Id usulan yang sedang diproses, supaya tombolnya bisa dikunci. */
  sedangDiproses: number | null;
  onSetujui: (proposal: Proposal) => void;
  onTolak: (proposal: Proposal) => void;
};

type Saring = ProposalModeration | 'semua';

/**
 * Antrean moderasi: usulan menunggu persetujuan paling lama di atas (yang menunggu paling lama
 * ditinjau lebih dulu). Menyetujui langsung; menolak lewat pop-up yang mewajibkan alasan.
 * Moderasi terpisah dari status kemajuan usulan.
 */
export function ModerationQueue({
  proposals,
  sedangDiproses,
  onSetujui,
  onTolak,
}: ModerationQueueProps) {
  const [saring, setSaring] = useState<Saring>('Menunggu');

  const jumlah = useMemo(() => {
    const hasil = { semua: proposals.length } as Record<Saring, number>;
    for (const item of PROPOSAL_MODERATION_STATUSES) {
      hasil[item] = proposals.filter((proposal) => proposal.moderasi === item).length;
    }
    return hasil;
  }, [proposals]);

  const tampil = useMemo(
    () =>
      proposals
        .filter((proposal) => saring === 'semua' || proposal.moderasi === saring)
        .sort((a, b) => new Date(a.dibuat_pada).getTime() - new Date(b.dibuat_pada).getTime()),
    [proposals, saring],
  );

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Saring menurut moderasi" className="flex flex-wrap gap-2">
        {(['Menunggu', 'Ditolak', 'Disetujui', 'semua'] as const).map((pilihan) => (
          <button
            key={pilihan}
            type="button"
            aria-pressed={saring === pilihan}
            onClick={() => setSaring(pilihan)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
              saring === pilihan
                ? 'border-ink bg-ink text-white'
                : 'border-border bg-surface text-ink hover:bg-active',
            )}
          >
            {pilihan === 'semua' ? 'Semua' : pilihan}
            <span
              className={cn(
                'rounded-md px-1.5 text-[12px] font-medium tabular-nums',
                saring === pilihan ? 'bg-white/20 text-white' : 'bg-pasir text-muted',
              )}
            >
              {jumlah[pilihan]}
            </span>
          </button>
        ))}
      </div>

      {tampil.length === 0 ? (
        <EmptyState
          title={
            saring === 'Menunggu' ? 'Tidak ada usulan yang menunggu' : 'Tidak ada usulan di sini'
          }
          description={
            saring === 'Menunggu'
              ? 'Semua usulan yang masuk sudah ditinjau.'
              : 'Ubah penyaring untuk melihat usulan lain.'
          }
        />
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2">
          {tampil.map((proposal) => {
            const diproses = sedangDiproses === proposal.id;
            return (
              <Card key={proposal.id} as="article" className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
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
                        {proposal.kategori} · oleh {proposal.pengusul_nama} ·{' '}
                        {formatTanggal(proposal.dibuat_pada)}
                      </p>
                    </div>
                  </div>
                  <ModerationBadge moderasi={proposal.moderasi} />
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-ink/80">{proposal.deskripsi}</p>
                <p className="mt-2 text-[13px] text-muted">
                  Estimasi {formatRupiahRingkas(proposal.estimasi_biaya)}
                  {proposal.lokasi ? ` · ${proposal.lokasi}` : ' · tanpa lokasi'}
                </p>

                {proposal.moderasi === 'Ditolak' && proposal.catatan_moderasi && (
                  <p className="mt-3 rounded-xl bg-active px-3.5 py-2.5 text-[13px] text-ink">
                    <b>Alasan penolakan:</b> {proposal.catatan_moderasi}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2.5">
                  {proposal.moderasi !== 'Disetujui' && (
                    <Button
                      type="button"
                      size="sm"
                      isLoading={diproses}
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
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
