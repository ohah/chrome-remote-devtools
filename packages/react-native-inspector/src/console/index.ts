// Console hook module (JavaScript layer) / 콘솔 훅 모듈 (JavaScript 레이어)

export {
  setConsoleCDPSender,
  setConsoleConnectionReady,
  enableConsoleHook,
  disableConsoleHook,
  isConsoleHookEnabled,
} from './console-hook';
export { valueToRemoteObject, type RemoteObject } from './value-to-remote-object';
