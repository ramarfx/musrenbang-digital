import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Creates the first manifest exclusively, before the runner makes any API write. */
export async function createManifestExclusively(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
}

export async function writeManifestAtomically(path: string, value: unknown) {
  const temporaryPath = `${path}.pending`;
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'w' });
  await rename(temporaryPath, path);
}
