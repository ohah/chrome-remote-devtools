// CDP exports (aligned with web client cdp/) / CDP export (웹 클라이언트 cdp/와 동일 구조)
export { Event, type CDPEventMethod } from './domain/protocol';
export {
  sendCDPEvent,
  setCDPEventSender,
  setCDPConnectionReady,
  type CDPEventMessage,
  type CDPEventSender,
} from './domain/base';
export { enableConsoleHook, disableConsoleHook, isConsoleHookEnabled } from './domain/runtime';
export { enableNetworkHook, disableNetworkHook, isNetworkHookEnabled } from './domain/network';
export { valueToRemoteObject, type RemoteObject } from './common/value-to-remote-object';
