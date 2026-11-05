import { env } from './env.js';

export type ManifestSource = 'auto' | 'releases' | 'repo';

export const DEFAULT_MANIFEST_SOURCE: ManifestSource = 'auto';
export const DEFAULT_MANIFESTS_DIR = '';

export const { MANIFEST_SOURCE, MANIFESTS_DIR } = env;

export function getManifestPath(fileName: string): string {
  return MANIFESTS_DIR ? `${MANIFESTS_DIR}/${fileName}` : fileName;
}
