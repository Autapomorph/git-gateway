import type { EnvConfig } from './src/lib/config/env.js';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Partial<Record<keyof EnvConfig, string>> {
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

export {};
