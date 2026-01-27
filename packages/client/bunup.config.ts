import { defineConfig } from 'bunup';

export default defineConfig({
  entry: 'src/index.ts',
  target: 'browser',
  format: ['esm', 'iife'],
  minify: true,
  outDir: 'dist',
});
