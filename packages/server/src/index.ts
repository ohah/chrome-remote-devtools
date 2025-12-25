import { createServer } from 'http';
import { createHttpRouter } from './http-routes';
import { SocketServer } from './socket-server';

// Log configuration / 로그 설정
// Default: disabled in both development and production / 기본값: 개발 및 프로덕션 모두에서 비활성화
const logEnabled = process.env.LOG_ENABLED === 'true';
const logMethodsEnv = process.env.LOG_METHODS || '';
const allowedMethods = logMethodsEnv
  ? new Set(
      logMethodsEnv
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
    )
  : null; // null means all methods are allowed / null이면 모든 메소드 허용

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const HOST = process.env.HOST || '0.0.0.0';

const socketServer = new SocketServer();
const server = createServer(createHttpRouter(socketServer));
socketServer.initSocketServer(server);

// Only start server when run directly / 직접 실행될 때만 서버 시작
if (import.meta.main) {
  server.listen(PORT, HOST, () => {
    // Server startup message is always shown / 서버 시작 메시지는 항상 표시
    console.log(`Server started at http://${HOST}:${PORT}`);
    if (logEnabled) {
      if (allowedMethods) {
        console.log(
          `Log filtering enabled / 로그 필터링 활성화: ${Array.from(allowedMethods).join(', ')}`
        );
      } else {
        console.log('All logs enabled / 모든 로그 활성화');
      }
    }
    // Logging is disabled by default / 로깅은 기본적으로 비활성화됨
  });
}

// Re-export SocketServer for backward compatibility / 하위 호환성을 위해 SocketServer 재export
export { SocketServer } from './socket-server';
export type { CDPMessage } from './socket-server';
