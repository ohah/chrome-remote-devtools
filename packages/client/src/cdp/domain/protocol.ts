// Implemented CDP protocol methods / 구현된 CDP 프로토콜 메서드
const protocolMethods = {
  Runtime: ['enable', 'evaluate', 'getProperties', 'releaseObject', 'callFunctionOn'],
  Page: ['enable', 'startScreencast', 'stopScreencast', 'getResourceTree', 'getResourceContent'],
  DOM: [
    'enable',
    'getDocument',
    'removeNode',
    'requestChildNodes',
    'requestNode',
    'getOuterHTML',
    'setOuterHTML',
    'setAttributesAsText',
    'setInspectedNode',
    'pushNodesByBackendIdsToFrontend',
    'performSearch',
    'getSearchResults',
    'discardSearchResults',
    'getNodeForLocation',
    'setNodeValue',
    'getBoxModel',
  ],
  Network: ['enable', 'getCookies', 'setCookie', 'deleteCookies', 'getResponseBody'],
  Console: ['enable', 'clearMessages'],
} as const;

export type ProtocolDomain = keyof typeof protocolMethods;
export type ProtocolMethods = typeof protocolMethods;

export default protocolMethods;

// CDP Events / CDP 이벤트
export const Event = {
  // Runtime events / Runtime 이벤트
  executionContextCreated: 'Runtime.executionContextCreated',
  consoleAPICalled: 'Runtime.consoleAPICalled',
  exceptionThrown: 'Runtime.exceptionThrown',

  // Page events / Page 이벤트
  screencastFrame: 'Page.screencastFrame',
  loadEventFired: 'Page.loadEventFired',
  domContentEventFired: 'Page.domContentEventFired',

  // DOM events / DOM 이벤트
  setChildNodes: 'DOM.setChildNodes',
  childNodeCountUpdated: 'DOM.childNodeCountUpdated',
  childNodeInserted: 'DOM.childNodeInserted',
  childNodeRemoved: 'DOM.childNodeRemoved',
  attributeModified: 'DOM.attributeModified',
  attributeRemoved: 'DOM.attributeRemoved',
  characterDataModified: 'DOM.characterDataModified',
  documentUpdated: 'DOM.documentUpdated',

  // Network events / Network 이벤트
  requestWillBeSent: 'Network.requestWillBeSent',
  responseReceivedExtraInfo: 'Network.responseReceivedExtraInfo',
  responseReceived: 'Network.responseReceived',
  loadingFinished: 'Network.loadingFinished',
  loadingFailed: 'Network.loadingFailed',

  // Console events / Console 이벤트
  messageAdded: 'Console.messageAdded',
} as const;
