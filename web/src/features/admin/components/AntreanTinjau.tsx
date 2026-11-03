import {
  PROPOSAL_MODERATION_STATUSES,
  type Proposal,
  type ProposalModeration,
} from '@musrenbang/shared';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { cn } from '@/lib/cn';
import { formatTanggal } from '@/lib/format';

type Saring = ProposalModeration | 'semua';

/**
 * Antrean tinjau di kolom kiri halaman admin: usulan yang menunggu paling lama di atas. Memilih
 * baris menampilkan rinciannya di kolom kanan; menyetujui bisa langsung dari baris, menolak
 * lewat pop-up yang mewajibkan alasan.
 */
export function AntreanTinjau({
  proposals,
  terpilihId,
  onPilih,
  sedangDiproses,
  onSetujui,
}: {
  proposals: Proposal[];
  terpilihId: number | null;
  onPilih: (id: number | null) => void;
  /** Id usulan yang sedang diproses, supaya tombolnya bisa dikunci. */
  sedangDiproses: number | null;
  onSetujui: (proposal: Proposal) => void;
}) {
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

  // Rincian di kanan selalu menunjukkan usulan yang ada di daftar ini.
  useEffect(() => {
    if (tampil.length === 0) {
      if (terpilihId !== null) onPilih(null);
    } else if (!tampil.some((proposal) => proposal.id === terpilihId)) {
      onPilih(tampil[0]!.id);
    }
  }, [tampil, terpilihId, onPilih]);

  return (
    <Card className="flex flex-col">
      <h2 className="text-lg font-bold">Antrean tinjau</h2>
      <div role="group" aria-label="Saring menurut moderasi" className="mt-3 flex flex-wrap gap-2">
        {(['Menunggu', 'Ditolak', 'Disetujui', 'semua'] as const).map((pilihan) => (
          <button
            key={pilihan}
            type="button"
            aria-pressed={saring === pilihan}
            onClick={() => setSaring(pilihan)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
              saring === pilihan
                ? 'border-ink bg-ink text-on-ink'
                : 'border-border bg-surface text-ink hover:bg-active',
            )}
          >
            {pilihan === 'semua' ? 'Semua' : pilihan}
            <span className="tabular-nums opacity-70">{jumlah[pilihan]}</span>
          </button>
        ))}
      </div>

      {tampil.length === 0 ? (
        <div className="mt-4">
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
        </div>
      ) : (
        <ul
          key={saring}
          className="stagger mt-3 flex-1 space-y-2 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1"
        >
          {tampil.map((proposal) => {
            const dipilih = proposal.id === terpilihId;
            return (
              <li
                key={proposal.id}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border-[1.5px] p-2 transition-colors duration-150',
                  dipilih ? 'border-edge bg-active' : 'border-border bg-surface hover:bg-active/60',
                )}
              >
                <button
                  type="button"
                  aria-pressed={dipilih}
                  onClick={() => onPilih(proposal.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                >
                  <CategoryTile kategori={proposal.kategori} small />
                  <span className="min-w-0">
                    <b className="block truncate text-sm">{proposal.judul}</b>
                    <span className="block truncate text-[12.5px] text-muted">
                      {proposal.pengusul_nama} · {formatTanggal(proposal.dibuat_pada)}
                    </span>
                  </span>
                </button>
                {proposal.moderasi === 'Disetujui' ? (
                  <ModerationBadge moderasi={proposal.moderasi} />
                ) : (
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
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
