import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProposalStatusUpdate } from '@musrenbang/shared';
import { queryKeys } from '@/lib/query-keys';
import { updateProposalStatus } from './api';

export function useUpdateProposalStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProposalStatusUpdate) => updateProposalStatus(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals }),
        queryClient.invalidateQueries({ queryKey: queryKeys.proposal(variables.proposalId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.proposalHistory(variables.proposalId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gap }),
      ]);
    },
  });
}
