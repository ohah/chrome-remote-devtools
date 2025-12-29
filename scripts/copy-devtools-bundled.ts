#!/usr/bin/env bun
// Copy devtools-frontend build output to bundled directory / devtools-frontend 빌드 결과물을 bundled 디렉토리로 복사
import { cpSync, statSync } from 'fs';
import { resolve } from 'path';

const devtoolsBuildPath = resolve(
  __dirname,
  '../devtools/devtools-frontend/out/Default/gen/front_end'
);
const bundledPath = resolve(__dirname, '../devtools/bundled/front_end');

// Check if build output exists / 빌드 결과물 존재 확인
if (!statSync(devtoolsBuildPath, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`Error: Build output not found at ${devtoolsBuildPath}`);
  console.error("Please run 'bun run build:devtools' or build devtools-frontend first");
  process.exit(1);
}

console.log('Copying devtools-frontend build output to bundled...');
console.log(`  From: ${devtoolsBuildPath}`);
console.log(`  To: ${bundledPath}`);

try {
  // Copy build folder recursively / 빌드 폴더 재귀적 복사
  cpSync(devtoolsBuildPath, bundledPath, {
    recursive: true,
    force: true,
  });
  console.log('✓ Successfully copied devtools-frontend to bundled');
} catch (error) {
  console.error('Failed to copy devtools-frontend:', error);
  process.exit(1);
}
