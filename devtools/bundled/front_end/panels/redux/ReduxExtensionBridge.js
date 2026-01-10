// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
/**
 * Get global ReduxExtensionBridge instance / 전역 ReduxExtensionBridge 인스턴스 가져오기
 * Creates instance if not exists / 인스턴스가 없으면 생성
 * Uses window object to ensure true singleton across all module scopes / 모든 모듈 스코프에서 진정한 싱글톤을 보장하기 위해 window 객체 사용
 */
export function getReduxExtensionBridge() {
    const win = window;
    if (!win.__DEVTOOLS_REDUX_BRIDGE__) {
        win.__DEVTOOLS_REDUX_BRIDGE__ = new ReduxExtensionBridge();
    }
    return win.__DEVTOOLS_REDUX_BRIDGE__;
}
/**
 * Initialize Redux bridge with TargetManager / TargetManager로 Redux bridge 초기화
 * Should be called once when DevTools starts / DevTools 시작 시 한 번 호출해야 함
 * Uses window object to ensure initialization happens only once across all module scopes
 * 모든 모듈 스코프에서 초기화가 한 번만 발생하도록 window 객체 사용
 */
export function initializeReduxBridge() {
    const win = window;
    const bridge = getReduxExtensionBridge();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    // Always try to attach to existing primary target / 항상 기존 primary target에 연결 시도
    // This is needed because target may not be available when first initialized / 첫 초기화 시 target이 없을 수 있으므로 필요
    const primaryTarget = targetManager.primaryPageTarget();
    if (primaryTarget) {
        bridge.attachToTargetIfNeeded(primaryTarget);
    }
    // Only register event listener once / 이벤트 리스너는 한 번만 등록
    if (win.__DEVTOOLS_REDUX_BRIDGE_INITIALIZED__) {
        return;
    }
    win.__DEVTOOLS_REDUX_BRIDGE_INITIALIZED__ = true;
    // Listen for new targets / 새 target 감지
    targetManager.addEventListener("AvailableTargetsChanged" /* SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED */, () => {
        const newTarget = targetManager.primaryPageTarget();
        if (newTarget) {
            bridge.attachToTargetIfNeeded(newTarget);
        }
    });
    console.log('[ReduxExtensionBridge] Global bridge initialized, listening for targets');
}
/**
 * Redux DevTools Extension과의 통신 브릿지 / Redux DevTools Extension과의 통신 브릿지
 * Extension의 chrome.runtime API를 시뮬레이션하고 CDP 메시지를 Extension 형식으로 변환 / Extension의 chrome.runtime API를 시뮬레이션하고 CDP 메시지를 Extension 형식으로 변환
 */
export class ReduxExtensionBridge {
    iframeWindow = null;
    target = null;
    observer = null;
    messagePort = null;
    messageListeners = [];
    connectCalled = false; // Track if connect was called / connect 호출 여부 추적
    startSent = false; // Track if START message was sent / START 메시지 전송 여부 추적
    messageBuffer = []; // Buffer for messages before panel is ready / 패널 준비 전 메시지 버퍼
    panelReady = false; // Track if panel (iframe) is ready / 패널(iframe) 준비 여부
    /**
     * Initialize bridge with iframe window / iframe window로 브릿지 초기화
     */
    initialize(iframeWindow) {
        console.log('[ReduxExtensionBridge] Initializing bridge with iframe window');
        this.iframeWindow = iframeWindow;
        // Inject extension API first to set up messagePort / messagePort 설정을 위해 먼저 extension API 주입
        this.injectExtensionAPI();
        // Wait a bit to ensure messagePort is ready / messagePort가 준비될 때까지 약간 대기
        // Then mark panel as ready and flush / 그 다음 패널을 준비 완료로 표시하고 플러시
        setTimeout(() => {
            if (this.messagePort) {
                // Mark panel as ready / 패널 준비 완료 표시
                this.panelReady = true;
                console.log('[ReduxExtensionBridge] Panel marked as ready, flushing buffered messages');
                // Flush buffered messages to extension / 버퍼된 메시지를 extension으로 전송
                this.flushMessageBuffer();
                // Wait for Extension to load and call chrome.runtime.connect / Extension이 로드되고 chrome.runtime.connect를 호출할 때까지 대기
                // If connect is not called within a reasonable time, send START anyway / 합리적인 시간 내에 connect가 호출되지 않으면 START를 보냄
                setTimeout(() => {
                    if (!this.connectCalled && this.target && !this.startSent) {
                        // Extension didn't call connect, send START anyway / Extension이 connect를 호출하지 않았으므로 START를 보냄
                        console.log('[ReduxExtensionBridge] Extension did not call connect, sending START anyway');
                        this.sendStartMessageToPage();
                    }
                }, 2000);
            }
            else {
                console.warn('[ReduxExtensionBridge] messagePort not ready after injection, retrying...');
                // Retry after a bit more time / 조금 더 기다린 후 재시도
                setTimeout(() => {
                    if (this.messagePort) {
                        this.panelReady = true;
                        console.log('[ReduxExtensionBridge] Panel marked as ready (retry), flushing buffered messages');
                        this.flushMessageBuffer();
                    }
                    else {
                        console.error('[ReduxExtensionBridge] messagePort still not ready after retry');
                    }
                }, 500);
            }
        }, 100);
    }
    /**
     * Flush buffered messages to extension / 버퍼된 메시지를 extension으로 전송
     * Messages are sent but buffer is preserved for re-flush on new connections / 메시지는 전송되지만 버퍼는 새 연결 시 재플러싱을 위해 보존됨
     */
    flushMessageBuffer() {
        if (!this.panelReady || !this.iframeWindow || !this.messagePort) {
            console.log('[ReduxExtensionBridge] Cannot flush buffer - panelReady:', this.panelReady, 'iframeWindow:', !!this.iframeWindow, 'messagePort:', !!this.messagePort);
            return;
        }
        console.log(`[ReduxExtensionBridge] Flushing ${this.messageBuffer.length} buffered messages`);
        // Send all messages but keep buffer intact for re-flush on new connections / 모든 메시지를 전송하지만 새 연결 시 재플러싱을 위해 버퍼는 유지
        for (const message of this.messageBuffer) {
            console.log('[ReduxExtensionBridge] Flushing message:', message);
            this.sendToExtensionDirect(message);
        }
        console.log('[ReduxExtensionBridge] Buffer flush complete, buffer preserved with', this.messageBuffer.length, 'messages');
    }
    /**
     * Inject chrome.runtime API into iframe / iframe에 chrome.runtime API 주입
     */
    injectExtensionAPI() {
        if (!this.iframeWindow) {
            return;
        }
        // MessageChannel을 사용하여 가상의 MessagePort 생성 / MessageChannel을 사용하여 가상의 MessagePort 생성
        const channel = new MessageChannel();
        this.messagePort = channel.port1;
        // MessagePort로 메시지 수신 / MessagePort로 메시지 수신
        this.messagePort.onmessage = event => {
            this.handleExtensionMessage(event.data);
        };
        // Redux DevTools Extension이 사용하는 chrome.runtime API 시뮬레이션 / Redux DevTools Extension이 사용하는 chrome.runtime API 시뮬레이션
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.iframeWindow.chrome = {
            runtime: {
                // Connect to background script / background script에 연결
                connect: (_options) => {
                    // Mark that connect was called / connect가 호출되었음을 표시
                    this.connectCalled = true;
                    // MessagePort를 반환하여 Extension이 통신할 수 있도록 함 / MessagePort를 반환하여 Extension이 통신할 수 있도록 함
                    const port = this.messagePort;
                    // When Extension connects, send START message / Extension이 연결되면 START 메시지 전송
                    // This matches the original Redux DevTools Extension behavior / 이것은 원래 Redux DevTools Extension 동작과 일치
                    // Original Extension sends START when panel connects (apiMiddleware.ts:588) / 원래 Extension은 panel이 연결될 때 START를 보냄
                    if (port && this.target) {
                        // Wait a bit for Extension to fully initialize / Extension이 완전히 초기화될 시간 대기
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
                    },
                },
                // Get URL for extension resource / extension 리소스 URL 가져오기
                getURL: (path) => {
                    return `devtools://devtools/bundled/panels/redux/extension/${path}`;
                },
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
                        return undefined;
                    },
                },
            },
        };
    }
    /**
     * Handle messages from Redux DevTools Extension / Redux DevTools Extension으로부터 메시지 처리
     */
    handleExtensionMessage(message) {
        // Handle messages from Extension to page / Extension에서 페이지로의 메시지 처리
        const extMessage = message;
        // Forward message to page via Runtime.evaluate / Runtime.evaluate를 통해 페이지로 메시지 전달
        // This matches the original Redux DevTools Extension behavior / 이것은 원래 Redux DevTools Extension 동작과 일치
        if (this.target && extMessage.type && (extMessage.type === 'START' || extMessage.type === 'UPDATE' || extMessage.type === 'DISPATCH' || extMessage.type === 'ACTION' || extMessage.type === 'IMPORT' || extMessage.type === 'EXPORT')) {
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
        // Mark that START was sent / START가 전송되었음을 표시
        this.startSent = true;
        // Send START message to page / 페이지에 START 메시지 전송
        this.sendMessageToPage({ type: 'START' });
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
     * Supports both web (window) and React Native (global) environments / 웹(window)과 React Native(global) 환경 모두 지원
     */
    sendMessageToPage(message) {
        if (!this.target) {
            return;
        }
        // Convert message to string for evaluation / 평가를 위해 메시지를 문자열로 변환
        const messageStr = JSON.stringify(message);
        // Send message to page via postMessage simulation / postMessage 시뮬레이션을 통해 페이지로 메시지 전송
        // The page's subscribe listener will receive this / 페이지의 subscribe 리스너가 이를 받음
        // Support both window (web) and global (React Native) / window(웹)과 global(React Native) 모두 지원
        this.target.runtimeAgent().invoke_evaluate({
            expression: `
        (function() {
          // Try window first (web), then global (React Native) / 먼저 window(웹) 시도, 그 다음 global(React Native)
          const globalObj = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
          const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
          const listeners = globalObj.__REDUX_DEVTOOLS_EXTENSION_LISTENERS__;

          if (extension && listeners) {
            const message = ${messageStr};
            // Trigger message listeners / 메시지 리스너 트리거
            listeners.forEach(listener => {
              try {
                listener(message);
              } catch (e) {
                console.warn('[ReduxDevTools] Error in message listener:', e);
              }
            });
            return 'message sent';
          }
          return 'no extension or listeners';
        })();
      `,
            returnByValue: true,
        }).then(response => {
            console.log('[ReduxExtensionBridge] Message sent result:', response.result?.value);
        }).catch((error) => {
            console.warn('[ReduxExtensionBridge] Failed to send message to page:', error);
        });
    }
    /**
     * Send message to Redux DevTools Extension iframe / Redux DevTools Extension iframe으로 메시지 전송
     * If panel is not ready, buffer the message / 패널이 준비되지 않았으면 메시지 버퍼링
     */
    sendToExtension(message) {
        // If panel is not ready, buffer the message / 패널이 준비되지 않았으면 메시지 버퍼링
        if (!this.panelReady || !this.iframeWindow || !this.messagePort) {
            const messageType = message.name === 'INIT_INSTANCE' ? 'INIT_INSTANCE' : message.message.type;
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
            console.warn('[ReduxExtensionBridge] Cannot send message - iframeWindow or messagePort not available');
            return;
        }
        console.log('[ReduxExtensionBridge] Sending message to extension:', message);
        // MessagePort로 메시지 전송 / MessagePort로 메시지 전송
        this.messagePort.postMessage(message);
        // 또는 postMessage로 직접 전송 / 또는 postMessage로 직접 전송
        this.iframeWindow.postMessage(message, '*');
        console.log('[ReduxExtensionBridge] Message sent via postMessage');
    }
    /**
     * Attach to target if not already attached / 아직 연결되지 않았으면 타겟에 연결
     * Used by global initializer / 전역 초기화에서 사용
     */
    attachToTargetIfNeeded(target) {
        // Skip if already attached to this target / 이미 이 타겟에 연결되어 있으면 건너뜀
        if (this.target === target) {
            return;
        }
        const router = target.router();
        if (!router?.connection) {
            return;
        }
        console.log('[ReduxExtensionBridge] Attaching to target:', target.name());
        this.attachToTarget(target, router.connection);
    }
    /**
     * Attach to target and listen for Redux CDP events / 타겟에 연결하고 Redux CDP 이벤트 리스닝
     */
    attachToTarget(target, connection) {
        // Cleanup previous observer if exists / 이전 observer가 있으면 정리
        if (this.observer && this.target) {
            const oldRouter = this.target.router();
            if (oldRouter?.connection) {
                oldRouter.connection.unobserve(this.observer);
            }
        }
        this.target = target;
        this.observer = {
            onEvent: (event) => {
                // Redux CDP 이벤트를 Redux DevTools Extension 형식으로 변환 / Redux CDP 이벤트를 Redux DevTools Extension 형식으로 변환
                const method = event.method;
                if (method === 'Redux.message') {
                    this.convertCDPToExtensionMessage(event);
                }
            },
            onDisconnect: (_reason) => {
                this.observer = null;
            },
        };
        connection.observe(this.observer);
        // After observer is registered, request re-send of cached stores from server
        // 서버에서 캐시된 store를 다시 보내달라고 요청
        // We do this by sending START message to the page, which will trigger the app to send INIT again
        // 페이지에 START 메시지를 보내서 앱이 다시 INIT을 보내도록 함
        console.log('[ReduxExtensionBridge] Observer registered, requesting re-initialization from page');
        this.requestReduxReInitialization();
    }
    /**
     * Request Redux stores to re-initialize / Redux store들에게 재초기화 요청
     * This sends a message to the page that triggers the app to send INIT messages again
     * 페이지에 메시지를 보내서 앱이 다시 INIT 메시지를 보내도록 함
     * Supports both web (window) and React Native (global) environments / 웹(window)과 React Native(global) 환경 모두 지원
     */
    requestReduxReInitialization() {
        if (!this.target) {
            return;
        }
        // Send a special message to trigger re-initialization
        // __REDUX_DEVTOOLS_EXTENSION__의 send 메서드를 호출하여 현재 상태를 다시 보내도록 함
        // Support both window (web) and global (React Native) / window(웹)과 global(React Native) 모두 지원
        this.target.runtimeAgent().invoke_evaluate({
            expression: `
        (function() {
          // Try window first (web), then global (React Native) / 먼저 window(웹) 시도, 그 다음 global(React Native)
          const globalObj = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
          const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;

          // Trigger all connected Redux stores to re-send their state
          // 연결된 모든 Redux store들이 상태를 다시 보내도록 트리거
          if (extension && typeof extension.notifyExtensionReady === 'function') {
            extension.notifyExtensionReady();
            return 'notifyExtensionReady called';
          } else if (extension) {
            // Fallback: trigger re-initialization by dispatching a synthetic message
            // 폴백: 합성 메시지를 디스패치하여 재초기화 트리거
            return '__REDUX_DEVTOOLS_EXTENSION__ exists but no notifyExtensionReady';
          }
          return 'no __REDUX_DEVTOOLS_EXTENSION__';
        })();
      `,
            returnByValue: true,
        }).then(response => {
            console.log('[ReduxExtensionBridge] Re-initialization request result:', response.result?.value);
        }).catch((error) => {
            console.warn('[ReduxExtensionBridge] Failed to request re-initialization:', error);
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
        // Redux.message 이벤트는 params에 직접 메시지 정보가 있음 / Redux.message event has message info directly in params
        // Redux DevTools Extension이 기대하는 메시지 형식으로 변환 / Redux DevTools Extension이 기대하는 메시지 형식으로 변환
        let extensionMessage;
        if (params.type === 'INIT_INSTANCE') {
            // INIT_INSTANCE는 특별한 형식 / INIT_INSTANCE has special format
            extensionMessage = {
                name: 'INIT_INSTANCE',
                instanceId: params.instanceId,
            };
        }
        else {
            // 다른 메시지는 RELAY 형식으로 래핑 / Other messages are wrapped in RELAY format
            extensionMessage = {
                name: 'RELAY',
                message: {
                    type: params.type,
                    instanceId: params.instanceId,
                    source: params.source,
                    payload: params.payload,
                    action: params.action,
                    name: params.name,
                    maxAge: params.maxAge,
                    nextActionId: params.nextActionId,
                    timestamp: params.timestamp,
                },
            };
        }
        // Send to extension via MessagePort (simulating chrome.runtime.Port) / MessagePort를 통해 extension으로 전송 (chrome.runtime.Port 시뮬레이션)
        // Redux DevTools Extension expects messages via chrome.runtime.Port.postMessage / Redux DevTools Extension은 chrome.runtime.Port.postMessage를 통해 메시지를 기대함
        this.sendToExtension(extensionMessage);
    }
    /**
     * Evaluate script in inspected page / inspected page에서 스크립트 실행
     */
    evaluateInInspectedPage(expression, callback) {
        if (!this.target) {
            if (callback) {
                callback(null, { isException: true, value: 'No target available' });
            }
            return;
        }
        const runtimeModel = this.target.model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
            if (callback) {
                callback(null, { isException: true, value: 'No runtime model available' });
            }
            return;
        }
        // Use Runtime API directly / Runtime API 직접 사용
        this.target.runtimeAgent().invoke_evaluate({
            expression,
            returnByValue: true,
        }).then((response) => {
            if (callback) {
                if (response.exceptionDetails) {
                    callback(null, {
                        isException: true,
                        value: response.exceptionDetails.text || 'Unknown error',
                    });
                }
                else {
                    callback(response.result?.value, undefined);
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
        // Always return at least the current page URL / 항상 최소한 현재 페이지 URL 반환
        const resources = [];
        if (!this.target) {
            // Fallback: use about:blank if no target / 타겟이 없으면 about:blank 사용
            if (callback) {
                callback([{ url: 'about:blank' }]);
            }
            return;
        }
        // Get inspected URL (current page URL) / inspected URL 가져오기 (현재 페이지 URL)
        const inspectedUrl = this.target.inspectedURL();
        if (inspectedUrl) {
            resources.push({ url: inspectedUrl });
        }
        const resourceTreeModel = this.target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        if (resourceTreeModel?.mainFrame) {
            // Get main frame URL if different from inspected URL / inspected URL과 다르면 메인 프레임 URL 가져오기
            const mainFrameUrl = resourceTreeModel.mainFrame.url;
            if (mainFrameUrl && mainFrameUrl !== inspectedUrl && !resources.some(r => r.url === mainFrameUrl)) {
                resources.push({ url: mainFrameUrl });
            }
            // Get all resources from the main frame / 메인 프레임의 모든 리소스 가져오기
            resourceTreeModel.mainFrame.resources().forEach(resource => {
                const url = resource.url;
                if (url && !resources.some(r => r.url === url)) {
                    resources.push({ url });
                }
            });
        }
        // Ensure at least one resource is returned / 최소한 하나의 리소스는 반환
        if (resources.length === 0) {
            resources.push({ url: inspectedUrl || 'about:blank' });
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
}
//# sourceMappingURL=ReduxExtensionBridge.js.map