import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  createProposal,
  getProposal,
  hasVoted,
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
