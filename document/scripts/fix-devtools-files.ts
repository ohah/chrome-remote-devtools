#!/usr/bin/env bun
// Fix devtools-frontend files after rspress build / rspress 빌드 후 devtools-frontend 파일 수정
// Some files may be overwritten as empty during build / 빌드 중 일부 파일이 빈 파일로 덮어씌워질 수 있음
import { copyFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const devtoolsPath = resolve(__dirname, '../../devtools/bundled/front_end');
const buildPath = resolve(__dirname, '../doc_build/devtools-frontend');

// Recursively copy directory / 디렉토리 재귀적 복사
function copyDir(src: string, dest: string): void {
  if (!existsSync(src)) {
    console.warn(`Source directory not found: ${src}`);
    return;
  }

  if (!existsSync(dest)) {
    console.warn(`Destination directory not found: ${dest}`);
    return;
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      // Create destination directory if it doesn't exist / 대상 디렉토리가 없으면 생성
      if (!existsSync(destPath)) {
        // Skip if destination doesn't exist and we're not creating it / 대상이 없고 생성하지 않으면 건너뛰기
        continue;
      }
      copyDir(srcPath, destPath);
    } else {
      // Only copy if source file exists and is not empty / 소스 파일이 존재하고 비어있지 않을 때만 복사
      if (existsSync(srcPath) && statSync(srcPath).isFile()) {
        const srcSize = statSync(srcPath).size;
        const destSize = existsSync(destPath) ? statSync(destPath).size : 0;

        // Copy if source is not empty and (destination doesn't exist or is empty) / 소스가 비어있지 않고 (대상이 없거나 비어있을 때) 복사
        if (srcSize > 0 && (destSize === 0 || !existsSync(destPath))) {
          try {
            copyFileSync(srcPath, destPath);
            console.log(`Fixed: ${entry.name} (${srcSize} bytes)`);
          } catch (error) {
            console.error(`Failed to copy ${entry.name}:`, error);
          }
        }
      }
    }
  }
}

console.log('Fixing devtools-frontend files after build...');
console.log(`  From: ${devtoolsPath}`);
console.log(`  To: ${buildPath}`);

if (!existsSync(devtoolsPath)) {
  console.error(`Error: Source directory not found at ${devtoolsPath}`);
  console.error('Please run "bun run copy:devtools-bundled" first');
  process.exit(1);
}

if (!existsSync(buildPath)) {
  console.error(`Error: Build directory not found at ${buildPath}`);
  console.error('Please run "bun run build" first');
  process.exit(1);
}

try {
  copyDir(devtoolsPath, buildPath);
  console.log('✓ Successfully fixed devtools-frontend files');
} catch (error) {
  console.error('Failed to fix devtools-frontend files:', error);
  process.exit(1);
}
