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
  /**
   * Initialize bridge with iframe window / iframe window로 브릿지 초기화
   */
  initialize(iframeWindow) {
    this.iframeWindow = iframeWindow;
    this.injectExtensionAPI();
    setTimeout(() => {
      if (!this.connectCalled && this.target && !this.startSent) {
        console.log("[ReduxExtensionBridge] Extension did not call connect, sending START anyway");
        this.sendStartMessageToPage();
      }
    }, 2e3);
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
   */
  sendToExtension(message) {
    if (!this.iframeWindow || !this.messagePort) {
      return;
    }
    this.messagePort.postMessage(message);
    this.iframeWindow.postMessage(message, "*");
  }
  /**
   * Attach to target and listen for Redux CDP events / 타겟에 연결하고 Redux CDP 이벤트 리스닝
   */
  attachToTarget(target, connection) {
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
  }
  /**
   * Convert CDP message to Extension message format / CDP 메시지를 Extension 메시지 형식으로 변환
   * Matches Redux DevTools Extension message format exactly / Redux DevTools Extension 메시지 형식과 정확히 일치
   */
  convertCDPToExtensionMessage(event) {
    const params = event.params;
    const extensionMessage = {
      type: params.type,
      instanceId: params.instanceId,
      source: params.source,
      payload: params.payload,
      action: params.action,
      name: params.name,
      maxAge: params.maxAge,
      nextActionId: params.nextActionId
    };
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
  #target = null;
  constructor() {
    super("redux");
    this.setHideOnDetach();
    this.#bridge = new ReduxExtensionBridge();
    this.#iframe = document.createElement("iframe");
    this.#iframe.className = "redux-devtools-iframe";
    this.#iframe.style.width = "100%";
    this.#iframe.style.height = "100%";
    this.#iframe.style.border = "none";
    const remoteBase = Root.Runtime.getRemoteBase();
    let reduxDevToolsPage;
    if (remoteBase) {
      reduxDevToolsPage = `${remoteBase.base}panels/redux/extension/devpanel.html`;
    } else {
      const currentPath = window.location.pathname;
      const basePath = currentPath.substring(0, currentPath.lastIndexOf("/"));
      reduxDevToolsPage = `${basePath}/panels/redux/extension/devpanel.html`;
    }
    this.#iframe.src = reduxDevToolsPage;
    this.#iframe.onload = () => {
      if (this.#iframe?.contentWindow) {
        this.#bridge.initialize(this.#iframe.contentWindow);
      }
    };
    this.contentElement.appendChild(this.#iframe);
    this.setupCDPListener();
  }
  wasShown() {
    super.wasShown();
    this.setupCDPListener();
    if (this.#iframe?.contentWindow && this.#target) {
      setTimeout(() => {
        this.#bridge.sendStartMessageToPageIfNeeded();
      }, 500);
    }
  }
  willHide() {
    super.willHide();
    this.cleanupCDPListener();
  }
  setupCDPListener() {
    const target = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      SDK2.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged", () => {
        const newTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
        if (newTarget && !this.#target) {
          this.#target = newTarget;
          this.attachToTarget(newTarget);
        }
      }, this);
      return;
    }
    this.#target = target;
    this.attachToTarget(target);
  }
  attachToTarget(target) {
    const router = target.router();
    if (!router?.connection) {
      return;
    }
    this.#bridge.attachToTarget(target, router.connection);
  }
  cleanupCDPListener() {
    this.#bridge.cleanup();
  }
};
export {
  ReduxPanel_exports as ReduxPanel
};
//# sourceMappingURL=redux.js.map
