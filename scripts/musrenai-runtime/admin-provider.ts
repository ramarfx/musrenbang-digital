import { validateResult, type Result } from '../musrenai-admin/worker';

// No address, contact, author identity, coordinates, or budget are part of this contract.
export type AdminContentInput = { title: string; description: string; category: string };
export type AdminContentProvider = (
  input: AdminContentInput,
  signal: AbortSignal,
) => Promise<Result>;

// Privacy approval and a reviewed redaction strategy are prerequisites. No environment flag can bypass this gate.
export function prepareAdminGeminiAdapter(): AdminContentProvider {
  return async () => {
    throw new Error('admin provider disabled pending privacy approval');
  };
}

// Explicitly labelled mock; no network call or content is included in the result.
export const mockAdminContentProvider: AdminContentProvider = async () =>
  validateResult({
    flags: ['needs_review'],
    reason: 'Hasil mock memerlukan tinjauan admin.',
    model: 'mock',
  });
