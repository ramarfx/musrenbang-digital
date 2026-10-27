export type SeedSchemaProbe = {
  resource: string;
  error: unknown;
};

/** Fail closed before the destructive seed steps if migration 7 is not present. */
export function assertSeedSchemaReady(probes: readonly SeedSchemaProbe[]): void {
  const failed = probes.filter((probe) => probe.error !== null && probe.error !== undefined);
  if (failed.length > 0) {
    throw new Error(
      `Schema belum mendukung seed MVP (${failed.map((probe) => probe.resource).join(', ')}). ` +
        'Seed dibatalkan sebelum data diubah.',
    );
  }
}
