// CDP domain exports (aligned with web client cdp/domain) / CDP 도메인 export (웹 클라이언트 cdp/domain과 동일 구조)
export { Event, type CDPEventMethod } from './protocol';
export {
  sendCDPEvent,
  setCDPEventSender,
  setCDPConnectionReady,
  type CDPEventMessage,
  type CDPEventSender,
} from './base';
export { enableConsoleHook, disableConsoleHook, isConsoleHookEnabled } from './runtime';
export { enableNetworkHook, disableNetworkHook, isNetworkHookEnabled } from './network';
