import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput } from '@musrenbang/shared';
import { queryKeys } from '@/lib/query-keys';
import { getProfile, getSession, signIn, signInWithGoogle, signUp } from './api';

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: getSession,
    staleTime: Infinity,
    retry: false,
  });
}

export function useProfileQuery(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => getProfile(userId as string),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
  });
}

export function useSignInMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => signIn(input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.session, data.session);
      if (data.session?.user) {
        queryClient.setQueryData(queryKeys.profile(data.session.user.id), data.profile);
      }
    },
  });
}

export function useSignUpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => signUp(input),
    onSuccess: (data) => {
      if (data.session) {
        queryClient.setQueryData(queryKeys.session, data.session);
      }
      if (data.session?.user && data.profile) {
        queryClient.setQueryData(queryKeys.profile(data.session.user.id), data.profile);
      }
    },
  });
}

export function useGoogleSignInMutation() {
  return useMutation({ mutationFn: signInWithGoogle });
}
