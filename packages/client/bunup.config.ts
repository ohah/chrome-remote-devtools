import { defineConfig } from 'bunup';

export default defineConfig({
  entry: 'src/index.ts',
  target: 'browser',
  format: ['esm', 'iife'],
  minify: true,
  outDir: 'dist',
  sourcemap: 'linked', // Generate separate .map files / 별도의 .map 파일 생성
  // Don't mark workspace dependencies as external / workspace 의존성을 external로 표시하지 않음
  // This ensures @ohah/chrome-remote-devtools-client-rrweb is bundled
  // @ohah/chrome-remote-devtools-client-rrweb가 번들에 포함되도록 보장
  external: ['@babel/runtime', '@rrweb/types'], // Only externalize non-workspace dependencies / workspace가 아닌 의존성만 external로 표시
});
