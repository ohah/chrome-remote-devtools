#!/usr/bin/env bun
// Build watch script for both ESM and IIFE / ESM과 IIFE 모두 빌드하는 watch 스크립트
import { spawn } from 'bun';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDir = join(__dirname, '..');

// Spawn both build processes in parallel / 두 빌드 프로세스를 병렬로 실행
const esmProcess = spawn(
  [
    'bun',
    'build',
    'src/index.ts',
    '--target',
    'browser',
    '--format',
    'esm',
    '--minify',
    '--outfile',
    'dist/index.js',
    '--watch',
  ],
  {
    cwd: clientDir,
    stdio: ['inherit', 'inherit', 'inherit'],
  }
);

const iifeProcess = spawn(
  [
    'bun',
    'build',
    'src/index.ts',
    '--target',
    'browser',
    '--format',
    'iife',
    '--minify',
    '--outfile',
    'dist/index.global.js',
    '--watch',
  ],
  {
    cwd: clientDir,
    stdio: ['inherit', 'inherit', 'inherit'],
  }
);

// Handle process exit / 프로세스 종료 처리
process.on('SIGINT', () => {
  esmProcess.kill();
  iifeProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  esmProcess.kill();
  iifeProcess.kill();
  process.exit(0);
});

// Wait for both processes / 두 프로세스 대기
await Promise.all([esmProcess.exited, iifeProcess.exited]);
