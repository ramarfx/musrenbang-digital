import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { createComment, listComments } from './api';

export function useCommentsQuery(proposalId: number | null) {
  return useQuery({
    queryKey: queryKeys.comments(proposalId ?? 0),
    queryFn: () => listComments(proposalId as number),
    enabled: proposalId !== null,
  });
}

export function useCreateCommentMutation(proposalId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isi: string) => createComment({ proposalId, isi }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.comments(proposalId) });
    },
  });
}
