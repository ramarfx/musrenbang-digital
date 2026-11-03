import type { Provider } from './provider.ts';

// One message reservation happens in the handler; each additional provider attempt
// obtains a fresh shared provider reservation before any network request.
export function withBoundedRetries(
  provider: Provider,
  reserveRetry: () => Promise<boolean>,
  options: {
    wait?: (ms: number, signal: AbortSignal) => Promise<void>;
    random?: () => number;
  } = {},
): Provider {
  const wait =
    options.wait ??
    ((ms, signal) =>
      new Promise<void>((resolve, reject) => {
        if (signal.aborted) return reject(new Error('timeout'));
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        }, ms);
        const onAbort = () => {
          clearTimeout(timer);
          reject(new Error('timeout'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }));
  const random = options.random ?? Math.random;
  return async (input, signal) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal.aborted) throw new Error('timeout');
      if (attempt > 0 && !(await reserveRetry())) throw new Error('provider unavailable');
      if (signal.aborted) throw new Error('timeout');
      try {
        return await provider(input, signal);
      } catch (error) {
        const retryable = error instanceof ProviderTemporaryError || error instanceof TypeError;
        if (!retryable || attempt === 1 || signal.aborted) throw new Error('provider unavailable');
        await wait(200 + Math.floor(random() * 200), signal);
      }
    }
    throw new Error('provider unavailable');
  };
}
export class ProviderTemporaryError extends Error {}
