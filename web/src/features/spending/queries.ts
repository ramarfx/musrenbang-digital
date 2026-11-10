import type { SpendingInput } from '@musrenbang/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { catatPengeluaran, listSpending } from './api';

export function useSpendingQuery(proposalId: number | null) {
  return useQuery({
    queryKey: queryKeys.proposalSpending(proposalId ?? 0),
    queryFn: () => listSpending(proposalId as number),
    enabled: proposalId !== null,
    staleTime: 30_000,
  });
}

export function useCatatPengeluaranMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SpendingInput) => catatPengeluaran(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.proposalSpending(variables.proposalId),
      });
    },
  });
}
