import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getPublicStats } from './api';

export function usePublicStatsQuery() {
  return useQuery({
    queryKey: queryKeys.publicStats,
    queryFn: getPublicStats,
    staleTime: 60_000,
    retry: false,
  });
}
