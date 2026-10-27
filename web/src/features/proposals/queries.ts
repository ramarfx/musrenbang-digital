import type { Proposal } from '@musrenbang/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  createProposal,
  getProposal,
  hasVoted,
  listMyStatusChanges,
  listMyVotes,
  listProposals,
  listStatusHistory,
  toggleVote,
} from './api';

export function useProposalsQuery() {
  return useQuery({
    queryKey: queryKeys.proposals,
    queryFn: listProposals,
  });
}

export function useProposalQuery(proposalId: number | null) {
  return useQuery({
    queryKey: queryKeys.proposal(proposalId ?? 0),
    queryFn: () => getProposal(proposalId as number),
    enabled: proposalId !== null,
  });
}

export function useStatusHistoryQuery(proposalId: number | null) {
  return useQuery({
    queryKey: queryKeys.proposalHistory(proposalId ?? 0),
    queryFn: () => listStatusHistory(proposalId as number),
    enabled: proposalId !== null,
  });
}

export function useHasVotedQuery(proposalId: number | null, userId: string | null) {
  return useQuery({
    queryKey: queryKeys.hasVoted(proposalId ?? 0, userId),
    queryFn: () => hasVoted(proposalId as number, userId as string),
    enabled: proposalId !== null && userId !== null,
  });
}

export function useCreateProposalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createProposal(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
    },
  });
}

export function useToggleVoteMutation(proposalId: number, userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (currentlyVoted: boolean) => toggleVote(proposalId, currentlyVoted),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.proposal(proposalId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.hasVoted(proposalId, userId),
        }),
      ]);
    },
  });
}

export function useMyVotesQuery(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.myVotes(userId),
    queryFn: () => listMyVotes(userId as string),
    enabled: userId !== null,
  });
}

/**
 * Upvote atau batalkan upvote dari kartu usulan. Tampilan diperbarui lebih dulu
 * (jumlah suara dan tanda sudah didukung), lalu dikembalikan kalau permintaan gagal.
 */
export function useToggleLikeMutation(userId: string | null) {
  const queryClient = useQueryClient();
  const votesKey = queryKeys.myVotes(userId);
  return useMutation({
    mutationFn: ({ proposalId, voted }: { proposalId: number; voted: boolean }) =>
      toggleVote(proposalId, voted),
    onMutate: async ({ proposalId, voted }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.proposals }),
        queryClient.cancelQueries({ queryKey: votesKey }),
      ]);
      const proposalsLama = queryClient.getQueryData<Proposal[]>(queryKeys.proposals);
      const votesLama = queryClient.getQueryData<number[]>(votesKey);
      const selisih = voted ? -1 : 1;
      queryClient.setQueryData<Proposal[]>(queryKeys.proposals, (data) =>
        data?.map((item) =>
          item.id === proposalId
            ? { ...item, jumlah_suara: Math.max(0, item.jumlah_suara + selisih) }
            : item,
        ),
      );
      queryClient.setQueryData<number[]>(votesKey, (data) => {
        const sekarang = data ?? [];
        return voted ? sekarang.filter((id) => id !== proposalId) : [...sekarang, proposalId];
      });
      return { proposalsLama, votesLama };
    },
    onError: (_error, _vars, konteks) => {
      queryClient.setQueryData(queryKeys.proposals, konteks?.proposalsLama);
      queryClient.setQueryData(votesKey, konteks?.votesLama);
    },
    onSettled: async (_data, _error, { proposalId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals }),
        queryClient.invalidateQueries({ queryKey: votesKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hasVoted(proposalId, userId) }),
      ]);
    },
  });
}

/** Perubahan status usulan milik pengguna; diperiksa ulang tiap menit selama halaman terbuka. */
export function useMyStatusChangesQuery(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.myStatusChanges(userId),
    queryFn: () => listMyStatusChanges(userId as string),
    enabled: userId !== null,
    refetchInterval: 60_000,
  });
}
