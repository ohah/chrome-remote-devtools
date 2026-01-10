// Server info utilities / 서버 정보 유틸리티
// Store server connection info in global for JSI access / JSI 접근을 위해 서버 연결 정보를 전역에 저장

// Type declarations for React Native environment / React Native 환경용 타입 선언
declare const global: typeof globalThis;

/**
 * Store server connection info in global for JSI access / JSI 접근을 위해 서버 연결 정보를 전역에 저장
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 */
export function setServerInfo(serverHost: string, serverPort: number): void {
  (global as any).__ChromeRemoteDevToolsServerHost = serverHost;
  (global as any).__ChromeRemoteDevToolsServerPort = serverPort;
}

/**
 * Get server connection info from global / 전역에서 서버 연결 정보 가져오기
 * @returns Object with host and port, or null if not set / host와 port를 포함한 객체, 설정되지 않았으면 null
 */
export function getServerInfo(): { host: string; port: number } | null {
  if (typeof global === 'undefined') {
    return null;
  }
  const serverHost = (global as any).__ChromeRemoteDevToolsServerHost;
  const serverPort = (global as any).__ChromeRemoteDevToolsServerPort;
  if (serverHost && serverPort) {
    return { host: serverHost, port: serverPort };
  }
  return null;
}
