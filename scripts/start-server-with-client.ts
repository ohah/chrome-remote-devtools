#!/usr/bin/env bun
// Start server with client build / 클라이언트 빌드와 함께 서버 시작
import { $ } from 'bun';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Build client first / 클라이언트를 먼저 빌드
console.log('Building client... / 클라이언트 빌드 중...');
try {
  await $`bun run build:client`.cwd(rootDir);
  console.log('Client built successfully / 클라이언트 빌드 완료');
} catch (error) {
  console.error('Failed to build client / 클라이언트 빌드 실패:', error);
  process.exit(1);
}

console.log('Starting server... / 서버 시작 중...');
// Start server directly / 서버 직접 시작
const serverPath = join(rootDir, 'packages/server/src/index.ts');
const serverProcess = Bun.spawn(['bun', 'run', '--watch', serverPath], {
  cwd: rootDir,
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    ...process.env,
    PORT: '8080',
  },
});

// Handle process exit / 프로세스 종료 처리
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  serverProcess.kill();
  process.exit(0);
});

// Wait for server process (it will never exit, so this blocks) / 서버 프로세스 대기 (절대 종료되지 않으므로 블로킹됨)
await serverProcess.exited;
