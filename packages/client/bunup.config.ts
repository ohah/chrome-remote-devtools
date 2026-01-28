import { defineConfig } from 'bunup';

export default defineConfig({
  entry: 'src/index.ts',
  target: 'browser',
  format: ['esm', 'iife'],
  minify: true,
  outDir: 'dist',
  sourcemap: 'linked', // Generate separate .map files / 별도의 .map 파일 생성
});
