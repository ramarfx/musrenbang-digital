export async function runTrackedWrite<TEntry, TResult>(options: {
  persist: () => Promise<void>;
  create: () => Promise<TResult>;
  entry: TEntry;
  record: (entry: TEntry, result: TResult) => void;
}) {
  // The caller has already inserted the planned fixture identity into its manifest.
  // Persist it before I/O so a lost response can be recovered by its Run ID marker.
  await options.persist();
  const result = await options.create();
  options.record(options.entry, result);
  await options.persist();
  return result;
}
