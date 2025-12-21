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

// Configuration from environment variables / 환경 변수에서 설정 읽기
const config = {
  serverPort: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  inspectorPort: process.env.INSPECTOR_PORT ? parseInt(process.env.INSPECTOR_PORT) : 1420,
  examplePort: process.env.EXAMPLE_PORT ? parseInt(process.env.EXAMPLE_PORT) : 5173,
  includeExample: process.env.INCLUDE_EXAMPLE !== 'false', // Default: true
  healthCheckTimeout: process.env.HEALTH_CHECK_TIMEOUT
    ? parseInt(process.env.HEALTH_CHECK_TIMEOUT)
    : 10000, // 10 seconds
};

// Color codes for log prefixes / 로그 접두사용 색상 코드
const colors = {
  reset: '\x1b[0m',
  client: '\x1b[36m', // Cyan
  server: '\x1b[32m', // Green
  inspector: '\x1b[33m', // Yellow
  example: '\x1b[35m', // Magenta
  info: '\x1b[34m', // Blue
  error: '\x1b[31m', // Red
  success: '\x1b[32m', // Green
  warning: '\x1b[33m', // Yellow
};

interface Service {
  name: string;
  color: string;
  cwd: string;
  command: string[];
  env?: Record<string, string>;
  port?: number;
  healthCheckUrl?: string;
  optional?: boolean;
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
    port: config.serverPort,
    healthCheckUrl: `http://localhost:${config.serverPort}/json`,
  },
  {
    name: 'INSPECTOR',
    color: colors.inspector,
    cwd: join(rootDir, 'packages/inspector'),
    command: ['bun', 'run', 'dev'],
    port: config.inspectorPort,
    healthCheckUrl: `http://localhost:${config.inspectorPort}`,
  },
  {
    name: 'EXAMPLE',
    color: colors.example,
    cwd: join(rootDir, 'examples/basic'),
    command: ['bun', 'run', 'dev'],
    port: config.examplePort,
    healthCheckUrl: `http://localhost:${config.examplePort}`,
    optional: true,
  },
].filter((service) => {
  // Filter out example if not included / 예제가 포함되지 않으면 제외
  if (service.name === 'EXAMPLE' && !config.includeExample) {
    return false;
  }
  return true;
});

// Store spawned processes / 실행된 프로세스 저장
const processes: Array<{ service: Service; proc: ReturnType<typeof spawn>; started: boolean }> = [];

// Check if port is available / 포트 사용 가능 여부 확인
async function checkPort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      method: 'GET',
      signal: AbortSignal.timeout(1000),
    }).catch(() => null);
    // If we get any response (even 404), port is in use / 응답이 오면 포트가 사용 중
    return response !== null;
  } catch {
    // Connection refused means port is available / 연결 거부는 포트가 사용 가능함을 의미
    return false;
  }
}

// Health check for service / 서비스 헬스 체크
async function healthCheck(url: string, timeout: number): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok || response.status === 404) {
        // 404 is OK for some services / 일부 서비스는 404도 정상
        return true;
      }
    } catch {
      // Service not ready yet, wait and retry / 서비스가 아직 준비되지 않음, 대기 후 재시도
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

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

  const failedServices: string[] = [];
  const startedServices: string[] = [];

  for (const service of services) {
    try {
      // Check if port is already in use / 포트가 이미 사용 중인지 확인
      if (service.port) {
        const portInUse = await checkPort(service.port);
        if (portInUse) {
          console.warn(
            `${colors.warning}⚠ Port ${service.port} is already in use. ${service.name} may fail to start.${colors.reset}`
          );
        }
      }

      const proc = spawn(service.command, {
        cwd: service.cwd,
        env: {
          ...process.env,
          ...service.env,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      });

      processes.push({ service, proc, started: false });

      // Setup output handling / 출력 처리 설정
      setupProcessOutput(service, proc).catch((error) => {
        console.error(
          `${colors.error}[${service.name}] Error handling output: ${error}${colors.reset}`
        );
      });

      // Handle process exit / 프로세스 종료 처리
      proc.exited.then((code) => {
        if (code !== 0 && code !== null) {
          const processInfo = processes.find((p) => p.proc === proc);
          if (processInfo) {
            processInfo.started = false;
            failedServices.push(service.name);
            console.error(
              `${colors.error}[${service.name}] Process exited with code ${code}${colors.reset}`
            );
          }
        }
      });

      // Small delay between starts to avoid port conflicts / 포트 충돌 방지를 위한 시작 간 지연
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failedServices.push(service.name);
      console.error(
        `${colors.error}[${service.name}] Failed to start: ${error}${colors.reset}`
      );
    }
  }

  // Wait for services to start and perform health checks / 서비스 시작 대기 및 헬스 체크 수행
  console.log(`${colors.info}Waiting for services to start...${colors.reset}\n`);

  const healthCheckPromises = processes.map(async ({ service, proc }) => {
    if (service.healthCheckUrl) {
      const isHealthy = await healthCheck(service.healthCheckUrl, config.healthCheckTimeout);
      const processInfo = processes.find((p) => p.proc === proc);
      if (processInfo) {
        processInfo.started = isHealthy;
      }
      if (isHealthy) {
        startedServices.push(service.name);
        return true;
      } else {
        // For optional services, don't count as failure / 선택적 서비스는 실패로 간주하지 않음
        if (!service.optional) {
          failedServices.push(service.name);
        }
        return false;
      }
    } else {
      // Services without health check (like CLIENT) are considered started / 헬스 체크가 없는 서비스는 시작된 것으로 간주
      const processInfo = processes.find((p) => p.proc === proc);
      if (processInfo) {
        processInfo.started = true;
      }
      startedServices.push(service.name);
      return true;
    }
  });

  await Promise.all(healthCheckPromises);

  // Print status summary / 상태 요약 출력
  console.log(`\n${colors.info}Development environment status:${colors.reset}`);
  console.log(`${colors.success}✅ Started: ${startedServices.join(', ')}${colors.reset}`);

  if (failedServices.length > 0) {
    console.log(
      `${colors.error}❌ Failed: ${failedServices.join(', ')}${colors.reset}`
    );
  }

  // Print service URLs / 서비스 URL 출력
  console.log(`\n${colors.info}Service URLs:${colors.reset}`);
  for (const service of services) {
    if (service.port && startedServices.includes(service.name)) {
      const url = service.healthCheckUrl || `http://localhost:${service.port}`;
      console.log(`${colors.info}  - ${service.name}: ${url}${colors.reset}`);
    }
  }

  if (failedServices.some((name) => !services.find((s) => s.name === name)?.optional)) {
    console.log(
      `\n${colors.warning}⚠ Some required services failed to start. Please check the logs above.${colors.reset}`
    );
    console.log(`${colors.info}Press Ctrl+C to stop all services${colors.reset}\n`);
  } else {
    console.log(`\n${colors.success}✅ Development environment ready!${colors.reset}`);
    console.log(`${colors.info}Press Ctrl+C to stop all services${colors.reset}\n`);
  }
}

// Start services / 서비스 시작
startServices().catch((error) => {
  console.error(`${colors.error}Failed to start services: ${error}${colors.reset}`);
  cleanup();
});
