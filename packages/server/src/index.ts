import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import { createHttpRouter } from './http-routes';
import { SocketServer, setLogConfig } from './socket-server';
import { parseCLIArgs } from './cli';

// Parse CLI arguments / CLI 인자 파싱
const cliOptions = parseCLIArgs();

// Log configuration / 로그 설정
// CLI 옵션이 환경 변수보다 우선순위가 높음 / CLI options take precedence over environment variables
const logEnabled = cliOptions.logEnabled ?? process.env.LOG_ENABLED === 'true';
const logMethodsEnv = cliOptions.logMethods || process.env.LOG_METHODS || '';
const logFile = cliOptions.logFile || process.env.LOG_FILE_PATH;

// Set log configuration / 로그 설정 적용
if (logFile) {
  setLogConfig(logEnabled, logMethodsEnv, logFile);
} else if (logEnabled || logMethodsEnv) {
  setLogConfig(logEnabled, logMethodsEnv);
}

const allowedMethods = logMethodsEnv
  ? new Set(
      logMethodsEnv
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
    )
  : null; // null means all methods are allowed / null이면 모든 메소드 허용

// SSL configuration / SSL 설정
// CLI 옵션이 환경 변수보다 우선순위가 높음 / CLI options take precedence over environment variables
const USE_SSL = cliOptions.useSsl ?? process.env.USE_SSL === 'true';
const SSL_CERT_PATH = cliOptions.sslCertPath || process.env.SSL_CERT_PATH;
const SSL_KEY_PATH = cliOptions.sslKeyPath || process.env.SSL_KEY_PATH;

// Port and host configuration / 포트 및 호스트 설정
// CLI 옵션이 환경 변수보다 우선순위가 높음 / CLI options take precedence over environment variables
const PORT =
  cliOptions.port ?? (process.env.PORT ? parseInt(process.env.PORT) : USE_SSL ? 8443 : 8080);
const HOST = cliOptions.host || process.env.HOST || '0.0.0.0';

const socketServer = new SocketServer();

// Create server based on SSL configuration / SSL 설정에 따라 서버 생성
let server: ReturnType<typeof createHttpServer> | ReturnType<typeof createHttpsServer>;

if (USE_SSL) {
  if (!SSL_CERT_PATH || !SSL_KEY_PATH) {
    console.error(
      'Error: SSL certificate and key paths must be provided when SSL is enabled / 오류: SSL이 활성화된 경우 SSL 인증서 및 키 경로를 제공해야 합니다\n' +
        '  Use --cert and --key options or set SSL_CERT_PATH and SSL_KEY_PATH environment variables / --cert 및 --key 옵션을 사용하거나 SSL_CERT_PATH 및 SSL_KEY_PATH 환경 변수를 설정하세요'
    );
    process.exit(1);
  }

  if (!existsSync(SSL_CERT_PATH) || !existsSync(SSL_KEY_PATH)) {
    console.error(
      `Error: SSL certificate files not found / 오류: SSL 인증서 파일을 찾을 수 없습니다\n` +
        `  Certificate: ${SSL_CERT_PATH}\n` +
        `  Key: ${SSL_KEY_PATH}`
    );
    process.exit(1);
  }

  try {
    const options = {
      cert: readFileSync(SSL_CERT_PATH),
      key: readFileSync(SSL_KEY_PATH),
    };
    server = createHttpsServer(options, createHttpRouter(socketServer));
  } catch (error) {
    console.error('Failed to load SSL certificates / SSL 인증서 로드 실패:', error);
    process.exit(1);
  }
} else {
  server = createHttpServer(createHttpRouter(socketServer));
}

socketServer.initSocketServer(server);

// Only start server when run directly / 직접 실행될 때만 서버 시작
if (import.meta.main) {
  server.listen(PORT, HOST, () => {
    const protocol = USE_SSL ? 'https' : 'http';
    const wsProtocol = USE_SSL ? 'wss' : 'ws';
    console.log(`Server started at ${protocol}://${HOST}:${PORT}`);
    console.log(`WebSocket available at ${wsProtocol}://${HOST}:${PORT}`);
    if (logEnabled) {
      if (allowedMethods) {
        console.log(
          `Log filtering enabled / 로그 필터링 활성화: ${Array.from(allowedMethods).join(', ')}`
        );
      } else {
        console.log('All logs enabled / 모든 로그 활성화');
      }
      if (logFile) {
        console.log(`Log file: ${logFile} / 로그 파일: ${logFile}`);
      }
    }
    // Logging is disabled by default / 로깅은 기본적으로 비활성화됨
  });
}

// Re-export SocketServer for backward compatibility / 하위 호환성을 위해 SocketServer 재export
export { SocketServer } from './socket-server';
export type { CDPMessage } from './socket-server';
