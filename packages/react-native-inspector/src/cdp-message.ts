// CDP message utilities / CDP 메시지 유틸리티
// Send CDP messages to Inspector WebSocket / Inspector WebSocket으로 CDP 메시지 전송

import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { Spec } from './NativeChromeRemoteDevToolsInspector';

// Try to get TurboModule first (New Architecture), fallback to Legacy Module / TurboModule을 먼저 시도 (New Architecture), Legacy Module로 폴백
const TurboModule = TurboModuleRegistry.get<Spec>('ChromeRemoteDevToolsInspector');
const LegacyModule = NativeModules.ChromeRemoteDevToolsInspector;
const ChromeRemoteDevToolsInspector = TurboModule || LegacyModule;

/**
 * Send CDP message to Inspector WebSocket / Inspector WebSocket으로 CDP 메시지 전송
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param message CDP message object / CDP 메시지 객체
 * @returns Promise that resolves when message is sent / 메시지가 전송되면 resolve되는 Promise
 */
export async function sendCDPMessage(
  serverHost: string,
  serverPort: number,
  message: unknown
): Promise<void> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  const messageStr = JSON.stringify(message);
  return ChromeRemoteDevToolsInspector.sendCDPMessage(serverHost, serverPort, messageStr);
}
