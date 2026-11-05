import { env } from './env.js';

export type SupportedGitProvider =
  'azure_devops' | 'bitbucket' | 'gitea' | 'gitflic' | 'github' | 'gitlab' | 'gitverse' | 'onedev';

export const DEFAULT_GIT_PROVIDER: SupportedGitProvider = 'github';
export const DEFAULT_REPO_BRANCH = 'main';

export const { GIT_API_URL, GIT_PROVIDER, GIT_TOKEN, REPO_BRANCH, REPO_NAME, REPO_OWNER } = env;

export function validateProviderEnv(): void {
  if (!GIT_TOKEN || !REPO_OWNER || !REPO_NAME) {
    throw new Error(
      `Server configuration error: Missing required credentials for '${GIT_PROVIDER}'. Ensure GIT_TOKEN, REPO_OWNER, and REPO_NAME are set.`,
    );
  }
}
