import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PriorityRankingItem } from '@musrenbang/shared';
import { queryKeys } from '@/lib/query-keys';
import { getAdminRankingSummary, getMyRanking, saveMyRanking } from './api';

export function useMyRankingQuery(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.ranking(userId),
    queryFn: getMyRanking,
    enabled: userId !== null,
  });
}

/** Menyimpan urutan tidak menyentuh data Bandingkan: urutan dan pembagian anggaran terpisah. */
export function useSaveRankingMutation(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: PriorityRankingItem[]) => saveMyRanking(items),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.ranking(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminRanking }),
      ]);
    },
  });
}

export function useAdminRankingQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.adminRanking,
    queryFn: getAdminRankingSummary,
    enabled,
    retry: false,
  });
}
