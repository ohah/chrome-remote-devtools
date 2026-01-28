import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  platform: 'browser',
  format: ['esm', 'iife'],
  minify: true,
  outDir: 'dist',
  sourcemap: true,
  // External dependencies that should not be bundled / 번들에 포함하지 않을 외부 의존성
  external: ['@babel/runtime', '@rrweb/types'],
  // Force bundling of workspace dependencies / workspace 의존성 강제 번들링
  noExternal: ['@ohah/chrome-remote-devtools-client-rrweb'],
  // Global name for IIFE build / IIFE 빌드의 전역 이름
  globalName: 'ChromeRemoteDevTools',
  clean: true,
  // Add ignoreList to sourcemaps after build / 빌드 후 소스맵에 ignoreList 추가
  // This hides bundled code from debugger stepping and error stack traces
  // 이렇게 하면 번들된 코드가 디버거 스텝과 에러 스택에서 숨겨집니다
  onSuccess: 'bun run scripts/add-ignore-list-to-sourcemaps.ts',
});
