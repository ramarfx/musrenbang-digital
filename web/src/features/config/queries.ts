import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getAppConfig } from './api';

export function useAppConfigQuery() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: getAppConfig,
    staleTime: 10 * 60_000,
  });
}
