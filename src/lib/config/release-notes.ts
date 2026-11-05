import { env } from './env.js';

export type ReleaseNotesDirStructure = 'auto' | 'flat' | 'nested';

export const DEFAULT_RELEASE_NOTES_DIR = 'release-notes';
export const DEFAULT_RELEASE_NOTES_DIR_STRUCTURE: ReleaseNotesDirStructure = 'auto';

export const { RELEASE_NOTES_DIR, RELEASE_NOTES_DIR_STRUCTURE } = env;
