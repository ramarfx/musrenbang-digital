import type { ProposalPhoto } from '@musrenbang/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { hapusFoto, listAllPhotos, listPhotos, unggahFoto } from './api';

export function usePhotosQuery(proposalId: number | null) {
  return useQuery({
    queryKey: queryKeys.proposalPhotos(proposalId ?? 0),
    queryFn: () => listPhotos(proposalId as number),
    enabled: proposalId !== null,
    staleTime: 30_000,
  });
}

/** Semua foto dikelompokkan per usulan (terbaru dulu), dipakai kartu di daftar usulan. */
export function useFotoPerUsulan(): Map<number, ProposalPhoto[]> {
  const query = useQuery({
    queryKey: queryKeys.allPhotos,
    queryFn: listAllPhotos,
    staleTime: 60_000,
  });
  return useMemo(() => {
    const peta = new Map<number, ProposalPhoto[]>();
    for (const foto of query.data ?? []) {
      const daftar = peta.get(foto.proposal_id) ?? [];
      daftar.push(foto);
      peta.set(foto.proposal_id, daftar);
    }
    return peta;
  }, [query.data]);
}

function useSegarkanFoto() {
  const queryClient = useQueryClient();
  return async (proposalId: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalPhotos(proposalId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos }),
    ]);
  };
}

export function useUnggahFotoMutation() {
  const segarkan = useSegarkanFoto();
  return useMutation({
    mutationFn: ({ proposalId, files }: { proposalId: number; files: File[] }) =>
      unggahFoto(proposalId, files),
    onSettled: async (_data, _error, variables) => segarkan(variables.proposalId),
  });
}

export function useHapusFotoMutation() {
  const segarkan = useSegarkanFoto();
  return useMutation({
    mutationFn: (photo: ProposalPhoto) => hapusFoto(photo),
    onSuccess: async (_data, photo) => segarkan(photo.proposal_id),
  });
}
