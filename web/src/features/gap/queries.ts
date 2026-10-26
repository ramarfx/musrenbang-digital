import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listGap } from './api';

export function useGapQuery() {
  return useQuery({
    queryKey: queryKeys.gap,
    queryFn: listGap,
    staleTime: 60_000,
  });
}
