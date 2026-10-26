import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listApbd } from './api';

export function useApbdQuery() {
  return useQuery({
    queryKey: queryKeys.apbd,
    queryFn: listApbd,
    staleTime: 60_000,
  });
}
