import { defineConfig } from 'tsdown';

/**
 * tsdown configuration for React Native Inspector package / React Native Inspector 패키지용 tsdown 설정
 * Builds CommonJS and ESM formats for React Native compatibility / React Native 호환성을 위해 CommonJS와 ESM 형식으로 빌드
 */
export default defineConfig({
  entry: './src/index.ts',
  outDir: './dist',
  format: ['esm', 'cjs'],
  sourcemap: true,
  dts: true,
  external: ['react-native'],
});
