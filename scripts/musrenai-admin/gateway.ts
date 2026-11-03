import { validateResult, type Job, type Provider, type Result } from './worker';

// Reserve must be backed by a shared, atomic provider-wide budget before any real adapter is wired.
export type ReserveAttempt = () => Promise<boolean>;
export function createGuardedGateway(options: {
  reserveAttempt: ReserveAttempt;
  invokeMock: Provider;
}): (job: Job) => Promise<Result> {
  return async (job) => {
    if (!(await options.reserveAttempt())) throw new Error('provider unavailable');
    return validateResult(await options.invokeMock(job));
  };
}
