#!/usr/bin/env bun
// Copy devtools-frontend build output to bundled directory / devtools-frontend 빌드 결과물을 bundled 디렉토리로 복사
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const devtoolsBuildPath = resolve(
  __dirname,
  '../devtools/devtools-frontend/out/Default/gen/front_end'
);
const bundledPath = resolve(__dirname, '../devtools/bundled/front_end');

// Recursively copy directory / 디렉토리 재귀적 복사
function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Check if build output exists / 빌드 결과물 존재 확인
if (!statSync(devtoolsBuildPath).isDirectory()) {
  console.error(`Error: Build output not found at ${devtoolsBuildPath}`);
  console.error(
    "Please run 'gclient sync' and 'npm run build' in devtools/devtools-frontend first"
  );
  process.exit(1);
}

console.log('Copying devtools-frontend build output to bundled...');
console.log(`  From: ${devtoolsBuildPath}`);
console.log(`  To: ${bundledPath}`);

try {
  copyDir(devtoolsBuildPath, bundledPath);
  console.log('✓ Successfully copied devtools-frontend to bundled');
} catch (error) {
  console.error('Failed to copy devtools-frontend:', error);
  process.exit(1);
}
