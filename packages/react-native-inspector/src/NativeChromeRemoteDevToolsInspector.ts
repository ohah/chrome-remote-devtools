/**
 * TurboModule spec file for Chrome Remote DevTools Inspector / Chrome Remote DevTools Inspector용 TurboModule spec 파일
 * This file defines the TypeScript interface for the native module / 네이티브 모듈의 TypeScript 인터페이스를 정의합니다
 *
 * Note: Native module loading is disabled; WebSocket/console/network will be implemented in JavaScript layer / 참고: 네이티브 모듈 로딩은 비활성화됨, WebSocket/콘솔/네트워크는 JavaScript 레이어에서 구현 예정
 */

import type { TurboModule } from 'react-native';

/**
 * TurboModule spec interface / TurboModule spec 인터페이스
 */
export interface Spec extends TurboModule {
  /**
   * Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
   * @param serverHost Server host / 서버 호스트
   * @param serverPort Server port / 서버 포트
   * @returns Promise that resolves when connection is established / 연결이 설정되면 resolve되는 Promise
   */
  connect(serverHost: string, serverPort: number): Promise<void>;

  /**
   * Disable debugger / 디버거 비활성화
   * @returns Promise that resolves when debugger is disabled / 디버거가 비활성화되면 resolve되는 Promise
   */
  disableDebugger(): Promise<void>;

  /**
   * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
   * @returns Promise that resolves to true if disconnected / 연결이 끊어졌으면 true로 resolve되는 Promise
   */
  isPackagerDisconnected(): Promise<boolean>;

  /**
   * Open debugger / 디버거 열기
   * @param serverHost Server host / 서버 호스트
   * @param serverPort Server port / 서버 포트
   * @param errorMessage Error message to show if failed / 실패 시 표시할 에러 메시지
   * @returns Promise that resolves when debugger is opened / 디버거가 열리면 resolve되는 Promise
   */
  openDebugger(serverHost: string, serverPort: number, errorMessage: string): Promise<void>;

  /**
   * Send CDP message to Inspector WebSocket / Inspector WebSocket으로 CDP 메시지 전송
   * @param message CDP message as JSON string / JSON 문자열로 된 CDP 메시지
   * @returns Promise that resolves when message is sent / 메시지가 전송되면 resolve되는 Promise
   */
  sendCDPMessage(message: string): Promise<void>;

  /**
   * Enable console hook / console 훅 활성화
   * @returns Promise that resolves to true if enabling succeeded / 활성화가 성공하면 true로 resolve되는 Promise
   */
  enableConsoleHook(): Promise<boolean>;

  /**
   * Disable console hook / console 훅 비활성화
   * @returns Promise that resolves to true if disabling succeeded / 비활성화가 성공하면 true로 resolve되는 Promise
   */
  disableConsoleHook(): Promise<boolean>;

  /**
   * Enable network hook / 네트워크 훅 활성화
   * @returns Promise that resolves to true if enabling succeeded / 활성화가 성공하면 true로 resolve되는 Promise
   */
  enableNetworkHook(): Promise<boolean>;

  /**
   * Disable network hook / 네트워크 훅 비활성화
   * @returns Promise that resolves to true if disabling succeeded / 비활성화가 성공하면 true로 resolve되는 Promise
   */
  disableNetworkHook(): Promise<boolean>;

  /**
   * Check if console hook is enabled / console 훅이 활성화되어 있는지 확인
   * @returns Promise that resolves to true if enabled / 활성화되어 있으면 true로 resolve되는 Promise
   */
  isConsoleHookEnabled(): Promise<boolean>;

  /**
   * Check if network hook is enabled / 네트워크 훅이 활성화되어 있는지 확인
   * @returns Promise that resolves to true if enabled / 활성화되어 있으면 true로 resolve되는 Promise
   */
  isNetworkHookEnabled(): Promise<boolean>;
}

/**
 * Native module is not loaded; use null. WebSocket/console/network will be implemented in JavaScript layer / 네이티브 모듈은 로드하지 않음, null 사용. WebSocket/콘솔/네트워크는 JavaScript 레이어에서 구현 예정
 */
export default null as Spec | null;
