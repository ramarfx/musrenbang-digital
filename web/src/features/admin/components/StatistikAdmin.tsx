import { PROPOSAL_STATUSES, type AdminStats, type Proposal } from '@musrenbang/shared';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { WARNA_STATUS } from '@/features/proposals/components/StatusBadge';
import { formatAngka } from '@/lib/format';

function KartuAngka({
  ikon,
  label,
  nilai,
  memuat,
}: {
  ikon: IconName;
  label: string;
  nilai: number | null;
  memuat: boolean;
}) {
  return (
    <div className="kartu-cap flex items-center gap-3 rounded-2xl bg-surface p-4">
      <span
        aria-hidden="true"
        className="grid size-11 flex-none place-items-center rounded-[13px] border-[1.5px] border-edge bg-surface text-ink shadow-[0_3px_0_var(--edge)]"
      >
        <Icon name={ikon} size={21} />
      </span>
      <span className="min-w-0">
        {memuat ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <b className="block text-2xl leading-tight font-bold tabular-nums">
            {nilai === null ? '-' : formatAngka(nilai)}
          </b>
        )}
        <span className="mt-0.5 block text-sm text-muted">{label}</span>
      </span>
    </div>
  );
}

/** Empat angka utama dashboard. Angka yang belum tersedia ditulis "-", bukan nol palsu. */
export function StatistikRingkas({
  stats,
  proposals,
  memuat,
}: {
  stats: AdminStats | null;
  proposals: Proposal[];
  memuat: boolean;
}) {
  const suaraDariDaftar = proposals.reduce((jumlah, item) => jumlah + item.jumlah_suara, 0);

  return (
    <section aria-label="Angka utama" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KartuAngka
          ikon="profil"
          label="Warga terdaftar"
          nilai={stats?.total_pengguna ?? null}
          memuat={memuat && !stats}
        />
        <KartuAngka
          ikon="usulan"
          label="Usulan masuk"
          nilai={stats?.total_usulan ?? (memuat ? null : proposals.length)}
          memuat={memuat && !stats}
        />
        <KartuAngka
          ikon="panah-atas"
          label="Dukungan warga"
          nilai={stats?.total_suara ?? (memuat ? null : suaraDariDaftar)}
          memuat={memuat && !stats}
        />
        <KartuAngka
          ikon="simulator"
          label="Warga membagi anggaran"
          nilai={stats?.jumlah_partisipan_alokasi ?? null}
          memuat={memuat && !stats}
        />
      </div>
      {!stats && !memuat && (
        <p className="text-sm text-muted">
          Sebagian angka dihitung dari daftar usulan karena statistik server belum tersedia.
        </p>
      )}
    </section>
  );
}

/**
 * Tahap usulan dibaca sebagai baris, bukan lima kolom sempit, supaya nama tahap panjang tetap
 * utuh di layar HP dan urutannya mudah diikuti dari atas ke bawah.
 */
export function GrafikTahap({
  stats,
  proposals,
}: {
  stats: AdminStats | null;
  proposals: Proposal[];
}) {
  const hitung = (status: (typeof PROPOSAL_STATUSES)[number]) =>
    stats?.usulan_per_status[status] ??
    proposals.filter((proposal) => proposal.status === status).length;
  const terbanyak = Math.max(1, ...PROPOSAL_STATUSES.map(hitung));

  return (
    <Card>
      <h2 className="text-lg font-bold">Tahap usulan</h2>
      <p className="mt-1 text-sm text-muted">
        Jumlah usulan di setiap tahap, dari Diajukan sampai Selesai.
      </p>
      <ol className="mt-4 space-y-2.5">
        {PROPOSAL_STATUSES.map((status) => {
          const jumlah = hitung(status);
          return (
            <li
              key={status}
              className="grid grid-cols-[minmax(6.5rem,auto)_minmax(0,1fr)_2.75rem] items-center gap-3"
            >
              <span className="text-sm font-semibold text-ink">{status}</span>
              <span className="h-3 overflow-hidden rounded-full bg-track" aria-hidden="true">
                <i
                  className="block h-full rounded-full"
                  style={{
                    width: jumlah > 0 ? `max(${(jumlah / terbanyak) * 100}%, 6px)` : 0,
                    backgroundColor: WARNA_STATUS[status],
                  }}
                />
              </span>
              <b className="text-right text-sm tabular-nums">{formatAngka(jumlah)}</b>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
