import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { createComment, listCommentCounts, listComments } from './api';

export function useCommentsQuery(proposalId: number | null) {
  return useQuery({
    queryKey: queryKeys.comments(proposalId ?? 0),
    queryFn: () => listComments(proposalId as number),
    enabled: proposalId !== null,
  });
}

const KUNCI_JUMLAH = ['comments', 'jumlah'] as const;

/** Jumlah komentar per id usulan; satu permintaan dipakai bersama oleh semua kartu. */
export function useCommentCountsQuery() {
  return useQuery({
    queryKey: KUNCI_JUMLAH,
    queryFn: listCommentCounts,
    staleTime: 60_000,
  });
}

export function useCreateCommentMutation(proposalId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isi: string) => createComment({ proposalId, isi }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.comments(proposalId) });
      await queryClient.invalidateQueries({ queryKey: KUNCI_JUMLAH });
    },
  });
}
