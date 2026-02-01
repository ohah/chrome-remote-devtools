// CDP Event method names (aligned with web client protocol) / CDP 이벤트 메서드명 (웹 클라이언트 프로토콜과 동일)
// Same values as packages/client/src/cdp/domain/protocol.ts Event / packages/client의 Event 상수와 동일

export const Event = {
  // Runtime events / Runtime 이벤트
  executionContextCreated: 'Runtime.executionContextCreated',
  consoleAPICalled: 'Runtime.consoleAPICalled',
  exceptionThrown: 'Runtime.exceptionThrown',
  bindingCalled: 'Runtime.bindingCalled',

  // Network events / Network 이벤트
  requestWillBeSent: 'Network.requestWillBeSent',
  responseReceivedExtraInfo: 'Network.responseReceivedExtraInfo',
  responseReceived: 'Network.responseReceived',
  loadingFinished: 'Network.loadingFinished',
  loadingFailed: 'Network.loadingFailed',
} as const;

export type CDPEventMethod = (typeof Event)[keyof typeof Event];
