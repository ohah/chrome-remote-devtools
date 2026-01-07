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
    /**
     * Initialize bridge with iframe window / iframe window로 브릿지 초기화
     */
    initialize(iframeWindow) {
        this.iframeWindow = iframeWindow;
        this.injectExtensionAPI();
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
        this.iframeWindow.chrome = {
            runtime: {
                // Connect to background script / background script에 연결
                connect: (options) => {
                    // MessagePort를 반환하여 Extension이 통신할 수 있도록 함 / MessagePort를 반환하여 Extension이 통신할 수 있도록 함
                    return this.messagePort;
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
        // Redux DevTools Extension의 메시지를 처리 / Redux DevTools Extension의 메시지를 처리
        // 여기서는 CDP 메시지로 변환하거나 필요한 작업 수행 / 여기서는 CDP 메시지로 변환하거나 필요한 작업 수행
        console.log('[ReduxExtensionBridge] Received message from extension:', message);
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
                if (method === 'Redux.init' ||
                    method === 'Redux.actionDispatched' ||
                    method === 'Redux.error') {
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
     */
    convertCDPToExtensionMessage(event) {
        const params = event.params;
        // Redux DevTools Extension이 기대하는 메시지 형식으로 변환 / Redux DevTools Extension이 기대하는 메시지 형식으로 변환
        const extensionMessage = {
            type: 'REDUX_MESSAGE',
            method: event.method,
            params,
            timestamp: Date.now(),
        };
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