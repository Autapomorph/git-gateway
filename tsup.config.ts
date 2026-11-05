import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.d.ts'],
  format: ['esm'],
  target: 'esnext',
  bundle: false,
  clean: true,
  sourcemap: true,
  dts: false,
  shims: false,
  outDir: 'dist',
});
