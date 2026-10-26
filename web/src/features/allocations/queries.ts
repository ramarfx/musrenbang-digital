import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AllocationAmount } from '@musrenbang/shared';
import { queryKeys } from '@/lib/query-keys';
import { listUserAllocations, saveAllocations } from './api';

export function useUserAllocationsQuery(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.allocations(userId),
    queryFn: () => listUserAllocations(userId as string),
    enabled: userId !== null,
  });
}

export function useSaveAllocationsMutation(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: AllocationAmount[]) => saveAllocations(items),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.allocations(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gap }),
      ]);
    },
  });
}
