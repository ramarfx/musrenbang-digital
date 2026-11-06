/**
 * Kunci query TanStack Query. Semua feature wajib memakai kunci di sini agar
 * invalidasi cache konsisten (mis. setelah vote, daftar dan detail ikut segar).
 */
export const queryKeys = {
  session: ['session'] as const,
  profile: (userId: string | null) => ['profile', userId] as const,
  config: ['config'] as const,
  categories: ['categories'] as const,
  myStatusChanges: (userId: string | null) => ['notifications', 'status', userId] as const,
  myVotes: (userId: string | null) => ['votes', 'mine', userId] as const,
  proposals: ['proposals'] as const,
  proposal: (proposalId: number) => ['proposals', 'detail', proposalId] as const,
  proposalHistory: (proposalId: number) => ['proposals', 'history', proposalId] as const,
  comments: (proposalId: number) => ['comments', proposalId] as const,
  hasVoted: (proposalId: number, userId: string | null) =>
    ['votes', 'has-voted', proposalId, userId] as const,
  allocations: (userId: string | null) => ['allocations', userId] as const,
  ranking: (userId: string | null) => ['ranking', 'mine', userId] as const,
  adminRanking: ['ranking', 'admin'] as const,
  gap: ['gap'] as const,
  publicStats: ['stats', 'public'] as const,
  adminStats: ['stats', 'admin'] as const,
  apbd: ['apbd'] as const,
};
