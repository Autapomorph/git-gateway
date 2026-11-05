import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env if present (safely ignored if file does not exist)
dotenv.config();

const envSchema = z.object({
  // Runtime environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server network config
  PORT: z
    .string()
    .default('3000')
    .transform(val => Number.parseInt(val, 10))
    .pipe(z.number().positive()),
  HOST: z.string().default('0.0.0.0'),

  // Git Provider credentials and details
  GIT_PROVIDER: z
    .enum([
      'github',
      'gitlab',
      'gitea',
      'gitverse',
      'gitflic',
      'bitbucket',
      'azure_devops',
      'onedev',
    ])
    .default('github'),
  GIT_TOKEN: z
    .string()
    .default('')
    .transform(v => v.trim()),
  REPO_OWNER: z
    .string()
    .default('')
    .transform(v => v.trim()),
  REPO_NAME: z
    .string()
    .default('')
    .transform(v => v.trim()),
  GIT_API_URL: z
    .string()
    .default('')
    .transform(v => v.trim().replace(/\/+$/, '')),
  REPO_BRANCH: z
    .string()
    .default('main')
    .transform(v => v.trim()),

  // Manifest options
  MANIFEST_SOURCE: z.enum(['auto', 'releases', 'repo']).default('auto'),
  MANIFESTS_DIR: z
    .string()
    .default('')
    .transform(v => v.trim().replace(/^\/+|\/+$/g, '')),

  // Release notes options
  RELEASE_NOTES_DIR: z
    .string()
    .default('release-notes')
    .transform(v => v.trim().replace(/^\/+|\/+$/g, '')),
  RELEASE_NOTES_DIR_STRUCTURE: z.enum(['auto', 'flat', 'nested']).default('auto'),
  FALLBACK_LANGUAGE: z
    .string()
    .default('en')
    .transform(v => v.trim()),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Environment validation failed: ${JSON.stringify(parsed.error.format())}`);
}

export const env: EnvConfig = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
