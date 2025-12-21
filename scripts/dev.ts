#!/usr/bin/env bun
// Unified development script / 통합 개발 스크립트
// Runs all development services in parallel / 모든 개발 서비스를 병렬로 실행
import { spawn } from 'bun';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Color codes for log prefixes / 로그 접두사용 색상 코드
const colors = {
  reset: '\x1b[0m',
  client: '\x1b[36m', // Cyan
  server: '\x1b[32m', // Green
  inspector: '\x1b[33m', // Yellow
  example: '\x1b[35m', // Magenta
  info: '\x1b[34m', // Blue
  error: '\x1b[31m', // Red
};

interface Service {
  name: string;
  color: string;
  cwd: string;
  command: string[];
  env?: Record<string, string>;
}

// Define services to run / 실행할 서비스 정의
const services: Service[] = [
  {
    name: 'CLIENT',
    color: colors.client,
    cwd: join(rootDir, 'packages/client'),
    command: ['bun', 'run', 'build:watch'],
  },
  {
    name: 'SERVER',
    color: colors.server,
    cwd: join(rootDir, 'packages/server'),
    command: ['bun', 'run', 'dev'],
  },
  {
    name: 'INSPECTOR',
    color: colors.inspector,
    cwd: join(rootDir, 'packages/inspector'),
    command: ['bun', 'run', 'dev'],
  },
  {
    name: 'EXAMPLE',
    color: colors.example,
    cwd: join(rootDir, 'examples/basic'),
    command: ['bun', 'run', 'dev'],
  },
];

// Store spawned processes / 실행된 프로세스 저장
const processes: Array<{ service: Service; proc: ReturnType<typeof spawn> }> = [];

// Handle process output / 프로세스 출력 처리
async function setupProcessOutput(service: Service, proc: ReturnType<typeof spawn>) {
  const prefix = `${service.color}[${service.name}]${colors.reset}`;

  // Handle stdout / stdout 처리
  if (proc.stdout && typeof proc.stdout !== 'number') {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter((line) => line.trim());
        for (const line of lines) {
          console.log(`${prefix} ${line}`);
        }
      }
    } catch {
      // Stream ended / 스트림 종료
    } finally {
      reader.releaseLock();
    }
  }

  // Handle stderr / stderr 처리
  if (proc.stderr && typeof proc.stderr !== 'number') {
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter((line) => line.trim());
        for (const line of lines) {
          console.error(`${prefix} ${colors.error}${line}${colors.reset}`);
        }
      }
    } catch {
      // Stream ended / 스트림 종료
    } finally {
      reader.releaseLock();
    }
  }
}

// Cleanup function / 정리 함수
function cleanup() {
  console.log(`\n${colors.info}Shutting down all services...${colors.reset}`);
  for (const { proc } of processes) {
    try {
      proc.kill();
    } catch {
      // Ignore errors during cleanup / 정리 중 오류 무시
    }
  }
  process.exit(0);
}

// Setup signal handlers / 시그널 핸들러 설정
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start all services / 모든 서비스 시작
async function startServices() {
  console.log(`${colors.info}Starting development environment...${colors.reset}\n`);

  for (const service of services) {
    try {
      const proc = spawn(service.command, {
        cwd: service.cwd,
        env: {
          ...process.env,
          ...service.env,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      });

      processes.push({ service, proc });

      // Setup output handling / 출력 처리 설정
      setupProcessOutput(service, proc).catch((error) => {
        console.error(
          `${colors.error}[${service.name}] Error handling output: ${error}${colors.reset}`
        );
      });

      // Handle process exit / 프로세스 종료 처리
      proc.exited.then((code) => {
        if (code !== 0 && code !== null) {
          console.error(
            `${colors.error}[${service.name}] Process exited with code ${code}${colors.reset}`
          );
        }
      });

      // Small delay between starts to avoid port conflicts / 포트 충돌 방지를 위한 시작 간 지연
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`${colors.error}[${service.name}] Failed to start: ${error}${colors.reset}`);
    }
  }

  // Wait a bit for services to start / 서비스 시작 대기
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`\n${colors.info}✅ Development environment ready!${colors.reset}`);
  console.log(`${colors.info}  - Server: http://localhost:8080${colors.reset}`);
  console.log(`${colors.info}  - Inspector: http://localhost:1420${colors.reset}`);
  console.log(`${colors.info}  - Example: http://localhost:5173${colors.reset}`);
  console.log(`\n${colors.info}Press Ctrl+C to stop all services${colors.reset}\n`);
}

// Start services / 서비스 시작
startServices().catch((error) => {
  console.error(`${colors.error}Failed to start services: ${error}${colors.reset}`);
  cleanup();
});
