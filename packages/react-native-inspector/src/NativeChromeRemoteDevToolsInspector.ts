/**
 * TurboModule spec file for Chrome Remote DevTools Inspector / Chrome Remote DevTools Inspector용 TurboModule spec 파일
 * This file defines the TypeScript interface for the native module / 네이티브 모듈의 TypeScript 인터페이스를 정의합니다
 *
 * Note: This is a spec file for React Native codegen / 참고: React Native codegen용 spec 파일입니다
 * For New Architecture (TurboModules), this file is used to generate native bindings / New Architecture (TurboModules)의 경우, 이 파일은 네이티브 바인딩을 생성하는 데 사용됩니다
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

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
}

/**
 * Get TurboModule instance / TurboModule 인스턴스 가져오기
 * This will use TurboModuleRegistry for New Architecture, or fallback to NativeModules / New Architecture의 경우 TurboModuleRegistry를 사용하고, 그렇지 않으면 NativeModules로 폴백합니다
 */
export default TurboModuleRegistry.getEnforcing<Spec>('ChromeRemoteDevToolsInspector');
