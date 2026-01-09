// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
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
    /**
     * Initialize bridge with iframe window / iframe window로 브릿지 초기화
     */
    initialize(iframeWindow) {
        this.iframeWindow = iframeWindow;
        this.injectExtensionAPI();
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
     */
    sendMessageToPage(message) {
        if (!this.target) {
            return;
        }
        // Convert message to string for evaluation / 평가를 위해 메시지를 문자열로 변환
        const messageStr = JSON.stringify(message);
        // Send message to page via postMessage simulation / postMessage 시뮬레이션을 통해 페이지로 메시지 전송
        // The page's subscribe listener will receive this / 페이지의 subscribe 리스너가 이를 받음
        this.target.runtimeAgent().invoke_evaluate({
            expression: `
        (function() {
          if (window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION_LISTENERS__) {
            const message = ${messageStr};
            // Trigger message listeners / 메시지 리스너 트리거
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
            returnByValue: false,
        }).catch((error) => {
            console.warn('[ReduxExtensionBridge] Failed to send message to page:', error);
        });
    }
    /**
     * Send message to Redux DevTools Extension iframe / Redux DevTools Extension iframe으로 메시지 전송
     */
    sendToExtension(message) {
        if (!this.iframeWindow || !this.messagePort) {
            return;
        }
        // MessagePort로 메시지 전송 / MessagePort로 메시지 전송
        this.messagePort.postMessage(message);
        // 또는 postMessage로 직접 전송 / 또는 postMessage로 직접 전송
        this.iframeWindow.postMessage(message, '*');
    }
    /**
     * Attach to target and listen for Redux CDP events / 타겟에 연결하고 Redux CDP 이벤트 리스닝
     */
    attachToTarget(target, connection) {
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
    }
    /**
     * Convert CDP message to Extension message format / CDP 메시지를 Extension 메시지 형식으로 변환
     * Matches Redux DevTools Extension message format exactly / Redux DevTools Extension 메시지 형식과 정확히 일치
     */
    convertCDPToExtensionMessage(event) {
        const params = event.params;
        // Redux.message 이벤트는 params에 직접 메시지 정보가 있음 / Redux.message event has message info directly in params
        // Redux DevTools Extension이 기대하는 메시지 형식으로 변환 / Redux DevTools Extension이 기대하는 메시지 형식으로 변환
        const extensionMessage = {
            type: params.type,
            instanceId: params.instanceId,
            source: params.source,
            payload: params.payload,
            action: params.action,
            name: params.name,
            maxAge: params.maxAge,
            nextActionId: params.nextActionId,
        };
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