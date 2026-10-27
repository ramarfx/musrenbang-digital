import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProposalModerationInput, ProposalStatusUpdateWithNote } from '@musrenbang/shared';
import { queryKeys } from '@/lib/query-keys';
import { getAdminStats, moderateProposal, updateProposalStatus } from './api';

export function useUpdateProposalStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProposalStatusUpdateWithNote) => updateProposalStatus(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals }),
        queryClient.invalidateQueries({ queryKey: queryKeys.proposal(variables.proposalId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.proposalHistory(variables.proposalId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gap }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminStats }),
      ]);
    },
  });
}

export function useModerateProposalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProposalModerationInput) => moderateProposal(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals }),
        queryClient.invalidateQueries({ queryKey: queryKeys.proposal(variables.proposalId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publicStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminStats }),
      ]);
    },
  });
}

export function useAdminStatsQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: getAdminStats,
    enabled,
    retry: false,
  });
}
