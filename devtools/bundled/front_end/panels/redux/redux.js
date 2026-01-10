var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/redux/ReduxPanel.js
var ReduxPanel_exports = {};
__export(ReduxPanel_exports, {
  ReduxPanel: () => ReduxPanel
});
import * as UI from "./../../ui/legacy/legacy.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Root from "./../../core/root/root.js";

// gen/front_end/panels/redux/ReduxExtensionBridge.js
import * as SDK from "./../../core/sdk/sdk.js";
var globalBridgeInstance = null;
var bridgeInitialized = false;
function getReduxExtensionBridge() {
  if (!globalBridgeInstance) {
    globalBridgeInstance = new ReduxExtensionBridge();
  }
  return globalBridgeInstance;
}
function initializeReduxBridge() {
  if (bridgeInitialized) {
    return;
  }
  bridgeInitialized = true;
  const bridge = getReduxExtensionBridge();
  const targetManager = SDK.TargetManager.TargetManager.instance();
  const primaryTarget = targetManager.primaryPageTarget();
  if (primaryTarget) {
    bridge.attachToTargetIfNeeded(primaryTarget);
  }
  targetManager.addEventListener("AvailableTargetsChanged", () => {
    const newTarget = targetManager.primaryPageTarget();
    if (newTarget) {
      bridge.attachToTargetIfNeeded(newTarget);
    }
  });
  console.log("[ReduxExtensionBridge] Global bridge initialized, listening for targets");
}
var ReduxExtensionBridge = class {
  iframeWindow = null;
  target = null;
  observer = null;
  messagePort = null;
  messageListeners = [];
  connectCalled = false;
  // Track if connect was called / connect 호출 여부 추적
  startSent = false;
  // Track if START message was sent / START 메시지 전송 여부 추적
  messageBuffer = [];
  // Buffer for messages before panel is ready / 패널 준비 전 메시지 버퍼
  panelReady = false;
  // Track if panel (iframe) is ready / 패널(iframe) 준비 여부
  /**
   * Initialize bridge with iframe window / iframe window로 브릿지 초기화
   */
  initialize(iframeWindow) {
    console.log("[ReduxExtensionBridge] Initializing bridge with iframe window");
    this.iframeWindow = iframeWindow;
    this.injectExtensionAPI();
    this.panelReady = true;
    console.log("[ReduxExtensionBridge] Panel marked as ready, flushing buffered messages");
    this.flushMessageBuffer();
    setTimeout(() => {
      if (!this.connectCalled && this.target && !this.startSent) {
        console.log("[ReduxExtensionBridge] Extension did not call connect, sending START anyway");
        this.sendStartMessageToPage();
      }
    }, 2e3);
  }
  /**
   * Flush buffered messages to extension / 버퍼된 메시지를 extension으로 전송
   * Messages are sent but buffer is preserved for re-flush on new connections / 메시지는 전송되지만 버퍼는 새 연결 시 재플러싱을 위해 보존됨
   */
  flushMessageBuffer() {
    if (!this.panelReady || !this.iframeWindow || !this.messagePort) {
      console.log("[ReduxExtensionBridge] Cannot flush buffer - panelReady:", this.panelReady, "iframeWindow:", !!this.iframeWindow, "messagePort:", !!this.messagePort);
      return;
    }
    console.log(`[ReduxExtensionBridge] Flushing ${this.messageBuffer.length} buffered messages`);
    for (const message of this.messageBuffer) {
      console.log("[ReduxExtensionBridge] Flushing message:", message);
      this.sendToExtensionDirect(message);
    }
    console.log("[ReduxExtensionBridge] Buffer flush complete, buffer preserved with", this.messageBuffer.length, "messages");
  }
  /**
   * Inject chrome.runtime API into iframe / iframe에 chrome.runtime API 주입
   */
  injectExtensionAPI() {
    if (!this.iframeWindow) {
      return;
    }
    const channel = new MessageChannel();
    this.messagePort = channel.port1;
    this.messagePort.onmessage = (event) => {
      this.handleExtensionMessage(event.data);
    };
    this.iframeWindow.chrome = {
      runtime: {
        // Connect to background script / background script에 연결
        connect: (_options) => {
          this.connectCalled = true;
          const port = this.messagePort;
          if (port && this.target) {
            setTimeout(() => {
              this.sendStartMessageToPage();
            }, 100);
          }
          return port;
        },
        // Send message to background script / background script로 메시지 전송
        sendMessage: (message, callback) => {
          this.handleExtensionMessage(message);
          if (callback) {
            callback({ success: true });
          }
        },
        // Listen to messages from background script / background script로부터 메시지 수신
        onMessage: {
          addListener: (callback) => {
            this.messageListeners.push(callback);
          },
          removeListener: (callback) => {
            const index = this.messageListeners.indexOf(callback);
            if (index > -1) {
              this.messageListeners.splice(index, 1);
            }
          }
        },
        // Get URL for extension resource / extension 리소스 URL 가져오기
        getURL: (path) => {
          return `devtools://devtools/bundled/panels/redux/extension/${path}`;
        }
      },
      devtools: {
        inspectedWindow: {
          // Evaluate script in inspected page / inspected page에서 스크립트 실행
          eval: (expression, callback) => {
            this.evaluateInInspectedPage(expression, callback);
          },
          // Get resources from inspected page / inspected page의 리소스 가져오기
          getResources: (callback) => {
            this.getPageResources(callback);
          },
          // Tab ID (not used in this context) / Tab ID (이 컨텍스트에서 사용되지 않음)
          get tabId() {
            return void 0;
          }
        }
      }
    };
  }
  /**
   * Handle messages from Redux DevTools Extension / Redux DevTools Extension으로부터 메시지 처리
   */
  handleExtensionMessage(message) {
    const extMessage = message;
    if (this.target && extMessage.type && (extMessage.type === "START" || extMessage.type === "UPDATE" || extMessage.type === "DISPATCH" || extMessage.type === "ACTION" || extMessage.type === "IMPORT" || extMessage.type === "EXPORT")) {
      this.sendMessageToPage({ type: extMessage.type, ...extMessage });
    }
  }
  /**
   * Send START message to page to request initial state / 초기 상태를 요청하기 위해 페이지에 START 메시지 전송
   * This matches the original Redux DevTools Extension behavior / 이것은 원래 Redux DevTools Extension 동작과 일치
   */
  sendStartMessageToPage() {
    if (!this.target || this.startSent) {
      return;
    }
    this.startSent = true;
    this.sendMessageToPage({ type: "START" });
  }
  /**
   * Send START message to page if not already sent / 아직 전송되지 않았다면 페이지에 START 메시지 전송
   */
  sendStartMessageToPageIfNeeded() {
    if (this.target && !this.startSent) {
      this.sendStartMessageToPage();
    }
  }
  /**
   * Send message to page via Runtime.evaluate / Runtime.evaluate를 통해 페이지로 메시지 전송
   * This simulates the original Redux DevTools Extension message passing / 이것은 원래 Redux DevTools Extension 메시지 전달을 시뮬레이션
   */
  sendMessageToPage(message) {
    if (!this.target) {
      return;
    }
    const messageStr = JSON.stringify(message);
    this.target.runtimeAgent().invoke_evaluate({
      expression: `
        (function() {
          if (window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION_LISTENERS__) {
            const message = ${messageStr};
            // Trigger message listeners / \uBA54\uC2DC\uC9C0 \uB9AC\uC2A4\uB108 \uD2B8\uB9AC\uAC70
            window.__REDUX_DEVTOOLS_EXTENSION_LISTENERS__.forEach(listener => {
              try {
                listener(message);
              } catch (e) {
                console.warn('[ReduxDevTools] Error in message listener:', e);
              }
            });
          }
        })();
      `,
      returnByValue: false
    }).catch((error) => {
      console.warn("[ReduxExtensionBridge] Failed to send message to page:", error);
    });
  }
  /**
   * Send message to Redux DevTools Extension iframe / Redux DevTools Extension iframe으로 메시지 전송
   * If panel is not ready, buffer the message / 패널이 준비되지 않았으면 메시지 버퍼링
   */
  sendToExtension(message) {
    if (!this.panelReady || !this.iframeWindow || !this.messagePort) {
      const messageType = message.name === "INIT_INSTANCE" ? "INIT_INSTANCE" : message.message.type;
      console.log(`[ReduxExtensionBridge] Buffering message (panelReady: ${this.panelReady}):`, messageType);
      this.messageBuffer.push(message);
      return;
    }
    this.sendToExtensionDirect(message);
  }
  /**
   * Send message directly to Redux DevTools Extension iframe / Redux DevTools Extension iframe으로 메시지 직접 전송
   */
  sendToExtensionDirect(message) {
    if (!this.iframeWindow || !this.messagePort) {
      console.warn("[ReduxExtensionBridge] Cannot send message - iframeWindow or messagePort not available");
      return;
    }
    console.log("[ReduxExtensionBridge] Sending message to extension:", message);
    this.messagePort.postMessage(message);
    this.iframeWindow.postMessage(message, "*");
    console.log("[ReduxExtensionBridge] Message sent via postMessage");
  }
  /**
   * Attach to target if not already attached / 아직 연결되지 않았으면 타겟에 연결
   * Used by global initializer / 전역 초기화에서 사용
   */
  attachToTargetIfNeeded(target) {
    if (this.target === target) {
      return;
    }
    const router = target.router();
    if (!router?.connection) {
      return;
    }
    console.log("[ReduxExtensionBridge] Attaching to target:", target.name());
    this.attachToTarget(target, router.connection);
  }
  /**
   * Attach to target and listen for Redux CDP events / 타겟에 연결하고 Redux CDP 이벤트 리스닝
   */
  attachToTarget(target, connection) {
    if (this.observer && this.target) {
      const oldRouter = this.target.router();
      if (oldRouter?.connection) {
        oldRouter.connection.unobserve(this.observer);
      }
    }
    this.target = target;
    this.observer = {
      onEvent: (event) => {
        const method = event.method;
        if (method === "Redux.message") {
          this.convertCDPToExtensionMessage(event);
        }
      },
      onDisconnect: (_reason) => {
        this.observer = null;
      }
    };
    connection.observe(this.observer);
    console.log("[ReduxExtensionBridge] Observer registered, requesting re-initialization from page");
    this.requestReduxReInitialization();
  }
  /**
   * Request Redux stores to re-initialize / Redux store들에게 재초기화 요청
   * This sends a message to the page that triggers the app to send INIT messages again
   * 페이지에 메시지를 보내서 앱이 다시 INIT 메시지를 보내도록 함
   */
  requestReduxReInitialization() {
    if (!this.target) {
      return;
    }
    this.target.runtimeAgent().invoke_evaluate({
      expression: `
        (function() {
          // Trigger all connected Redux stores to re-send their state
          // \uC5F0\uACB0\uB41C \uBAA8\uB4E0 Redux store\uB4E4\uC774 \uC0C1\uD0DC\uB97C \uB2E4\uC2DC \uBCF4\uB0B4\uB3C4\uB85D \uD2B8\uB9AC\uAC70
          if (window.__REDUX_DEVTOOLS_EXTENSION__ && typeof window.__REDUX_DEVTOOLS_EXTENSION__.notifyExtensionReady === 'function') {
            window.__REDUX_DEVTOOLS_EXTENSION__.notifyExtensionReady();
            return 'notifyExtensionReady called';
          } else if (window.__REDUX_DEVTOOLS_EXTENSION__) {
            // Fallback: trigger re-initialization by dispatching a synthetic message
            // \uD3F4\uBC31: \uD569\uC131 \uBA54\uC2DC\uC9C0\uB97C \uB514\uC2A4\uD328\uCE58\uD558\uC5EC \uC7AC\uCD08\uAE30\uD654 \uD2B8\uB9AC\uAC70
            return '__REDUX_DEVTOOLS_EXTENSION__ exists but no notifyExtensionReady';
          }
          return 'no __REDUX_DEVTOOLS_EXTENSION__';
        })();
      `,
      returnByValue: true
    }).then((response) => {
      console.log("[ReduxExtensionBridge] Re-initialization request result:", response.result?.value);
    }).catch((error) => {
      console.warn("[ReduxExtensionBridge] Failed to request re-initialization:", error);
    });
  }
  /**
   * Convert CDP message to Extension message format / CDP 메시지를 Extension 메시지 형식으로 변환
   * Matches Redux DevTools Extension message format exactly / Redux DevTools Extension 메시지 형식과 정확히 일치
   *
   * Extension expects:
   * - {name: "INIT_INSTANCE", instanceId: number} for INIT_INSTANCE type
   * - {name: "RELAY", message: {...}} for other message types
   * Extension은 다음을 기대함:
   * - {name: "INIT_INSTANCE", instanceId: number} (INIT_INSTANCE 타입의 경우)
   * - {name: "RELAY", message: {...}} (다른 메시지 타입의 경우)
   */
  convertCDPToExtensionMessage(event) {
    const params = event.params;
    let extensionMessage;
    if (params.type === "INIT_INSTANCE") {
      extensionMessage = {
        name: "INIT_INSTANCE",
        instanceId: params.instanceId
      };
    } else {
      extensionMessage = {
        name: "RELAY",
        message: {
          type: params.type,
          instanceId: params.instanceId,
          source: params.source,
          payload: params.payload,
          action: params.action,
          name: params.name,
          maxAge: params.maxAge,
          nextActionId: params.nextActionId,
          timestamp: params.timestamp
        }
      };
    }
    this.sendToExtension(extensionMessage);
  }
  /**
   * Evaluate script in inspected page / inspected page에서 스크립트 실행
   */
  evaluateInInspectedPage(expression, callback) {
    if (!this.target) {
      if (callback) {
        callback(null, { isException: true, value: "No target available" });
      }
      return;
    }
    const runtimeModel = this.target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      if (callback) {
        callback(null, { isException: true, value: "No runtime model available" });
      }
      return;
    }
    this.target.runtimeAgent().invoke_evaluate({
      expression,
      returnByValue: true
    }).then((response) => {
      if (callback) {
        if (response.exceptionDetails) {
          callback(null, {
            isException: true,
            value: response.exceptionDetails.text || "Unknown error"
          });
        } else {
          callback(response.result?.value, void 0);
        }
      }
    }).catch((error) => {
      if (callback) {
        callback(null, { isException: true, value: error.message });
      }
    });
  }
  /**
   * Get page resources / 페이지 리소스 가져오기
   */
  getPageResources(callback) {
    const resources = [];
    if (!this.target) {
      if (callback) {
        callback([{ url: "about:blank" }]);
      }
      return;
    }
    const inspectedUrl = this.target.inspectedURL();
    if (inspectedUrl) {
      resources.push({ url: inspectedUrl });
    }
    const resourceTreeModel = this.target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel?.mainFrame) {
      const mainFrameUrl = resourceTreeModel.mainFrame.url;
      if (mainFrameUrl && mainFrameUrl !== inspectedUrl && !resources.some((r) => r.url === mainFrameUrl)) {
        resources.push({ url: mainFrameUrl });
      }
      resourceTreeModel.mainFrame.resources().forEach((resource) => {
        const url = resource.url;
        if (url && !resources.some((r) => r.url === url)) {
          resources.push({ url });
        }
      });
    }
    if (resources.length === 0) {
      resources.push({ url: inspectedUrl || "about:blank" });
    }
    if (callback) {
      callback(resources);
    }
  }
  /**
   * Cleanup / 정리
   */
  cleanup() {
    if (this.observer && this.target) {
      const router = this.target.router();
      if (router?.connection) {
        router.connection.unobserve(this.observer);
      }
      this.observer = null;
    }
    this.messageListeners = [];
  }
};

// gen/front_end/panels/redux/ReduxPanel.js
var ReduxPanel = class extends UI.Panel.Panel {
  #iframe = null;
  #bridge;
  constructor() {
    super("redux");
    this.setHideOnDetach();
    initializeReduxBridge();
    this.#bridge = getReduxExtensionBridge();
    this.#iframe = document.createElement("iframe");
    this.#iframe.className = "redux-devtools-iframe";
    this.#iframe.style.width = "100%";
    this.#iframe.style.height = "100%";
    this.#iframe.style.border = "none";
    const remoteBase = Root.Runtime.getRemoteBase();
    let reduxDevToolsPage;
    if (remoteBase) {
      reduxDevToolsPage = `${remoteBase.base}panels/plugins/redux-plugin/index.html`;
    } else {
      const currentPath = window.location.pathname;
      const basePath = currentPath.substring(0, currentPath.lastIndexOf("/"));
      reduxDevToolsPage = `${basePath}/panels/plugins/redux-plugin/index.html`;
    }
    this.#iframe.src = reduxDevToolsPage;
    this.#iframe.onload = () => {
      if (this.#iframe?.contentWindow) {
        this.#bridge.initialize(this.#iframe.contentWindow);
      }
    };
    this.contentElement.appendChild(this.#iframe);
  }
  wasShown() {
    super.wasShown();
    if (this.#iframe?.contentWindow) {
      this.#bridge.initialize(this.#iframe.contentWindow);
    }
    const target = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (this.#iframe?.contentWindow && target) {
      setTimeout(() => {
        this.#bridge.sendStartMessageToPageIfNeeded();
      }, 500);
    }
  }
  willHide() {
    super.willHide();
  }
};
export {
  ReduxPanel_exports as ReduxPanel
};
//# sourceMappingURL=redux.js.map
