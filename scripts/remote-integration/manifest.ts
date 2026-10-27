import { rename, writeFile } from 'node:fs/promises';

export async function writeManifestAtomically(path: string, value: unknown) {
  const temporaryPath = `${path}.pending`;
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'w' });
  await rename(temporaryPath, path);
}
