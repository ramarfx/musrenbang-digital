import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import { useMyVotesQuery, useToggleLikeMutation } from '../queries';

type UpvoteButtonProps = {
  proposalId: number;
  jumlah: number;
  /** `terang` untuk di atas kartu hijau. */
  terang?: boolean;
  className?: string;
};

/**
 * Tombol upvote di kartu usulan: panah ke atas dan jumlah suara, seperti upvote di forum.
 * Ditekan sekali = upvote (satu akun satu suara), ditekan lagi = batal. Tanpa login, tombol
 * mengajak masuk. Panah naik sekali saat di-upvote (kelas `upvote-naik`), tanpa gerak berulang.
 */
export function UpvoteButton({ proposalId, jumlah, terang = false, className }: UpvoteButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? null;
  const myVotes = useMyVotesQuery(userId);
  const toggle = useToggleLikeMutation(userId);
  // Naik tiap kali didukung; dipakai sebagai `key` supaya animasinya diputar ulang.
  const [pop, setPop] = useState(0);
  const sudah = myVotes.data?.includes(proposalId) ?? false;

  const tekan = () => {
    if (!user) {
      toast('Masuk dulu untuk meng-upvote usulan.', {
        action: { label: 'Masuk', onClick: () => navigate('/login') },
      });
      return;
    }
    if (toggle.isPending || myVotes.isPending) return;
    if (!sudah) setPop((n) => n + 1);
    toggle.mutate({ proposalId, voted: sudah }, { onError: (error) => toast.error(error.message) });
  };

  return (
    <button
      type="button"
      onClick={tekan}
      aria-pressed={sudah}
      aria-label={sudah ? 'Batalkan upvote' : 'Upvote usulan ini'}
      className={cn(
        'relative inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
        terang
          ? sudah
            ? 'border-white bg-white text-hijau'
            : 'border-white/40 text-white hover:bg-white/15'
          : sudah
            ? 'border-edge bg-hijau-terang text-hitam'
            : 'border-border bg-surface text-ink hover:bg-active',
        className,
      )}
    >
      {pop > 0 && sudah && (
        <span
          key={`gelombang-${pop}`}
          aria-hidden="true"
          className="upvote-gelombang pointer-events-none absolute inset-0 rounded-xl border-2 border-current"
        />
      )}
      <span key={`panah-${pop}`} className={pop > 0 && sudah ? 'upvote-naik' : undefined}>
        <Icon name="panah-atas" size={16} filled={sudah} />
      </span>
      <span className="tabular-nums">{formatAngka(jumlah)}</span>
    </button>
  );
}
