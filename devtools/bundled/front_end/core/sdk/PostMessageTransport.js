// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * PostMessageTransport implements CDP protocol communication via postMessage API / PostMessageTransport는 postMessage API를 통해 CDP 프로토콜 통신을 구현합니다.
 *
 * This transport allows DevTools to communicate with parent window (iframe) or opener window (popup) / 이 transport는 DevTools가 부모 창(iframe) 또는 열린 창(popup)과 통신할 수 있게 합니다.
 * without requiring a WebSocket connection / WebSocket 연결 없이.
 */
import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Text to indicate postMessage connection cannot find host window / postMessage 연결이 호스트 창을 찾을 수 없음을 나타내는 텍스트
     */
    noHostWindow: 'Can not find host window',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/PostMessageTransport.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * PostMessageTransport implements ConnectionTransport using postMessage API / PostMessageTransport는 postMessage API를 사용하여 ConnectionTransport를 구현합니다.
 *
 * This transport is used when DevTools is loaded in an iframe or popup window / 이 transport는 DevTools가 iframe 또는 팝업 창에 로드될 때 사용됩니다.
 * and needs to communicate with the parent/opener window via postMessage / 부모/열린 창과 postMessage를 통해 통신해야 할 때.
 */
export class PostMessageTransport {
    onMessage = null;
    #onDisconnect = null;
    #targetWindow = null;
    #messageHandler = this.#onMessageReceived.bind(this);
    #ready = false;
    constructor(onConnectionLost) {
        // Determine target window (parent for iframe, opener for popup) / 대상 창 결정 (iframe은 parent, 팝업은 opener)
        if (window.opener) {
            this.#targetWindow = window.opener;
        }
        else if (window !== window.top) {
            this.#targetWindow = window.parent;
        }
        else {
            onConnectionLost(i18nString(UIStrings.noHostWindow));
            return;
        }
        // Listen for CDP messages from parent/opener / parent/opener로부터 CDP 메시지 수신
        window.addEventListener('message', this.#messageHandler);
        // Notify parent/opener that we're ready / parent/opener에 준비 완료 알림
        if (this.#targetWindow) {
            const readyMessage = { type: 'DEVTOOLS_READY' };
            this.#targetWindow.postMessage(readyMessage, '*');
            this.#ready = true;
        }
    }
    /**
     * Handle incoming postMessage events / 들어오는 postMessage 이벤트 처리
     */
    #onMessageReceived(event) {
        // Only accept messages from target window / 대상 창으로부터의 메시지만 수락
        if (event.source !== this.#targetWindow) {
            return;
        }
        // Handle CDP protocol messages / CDP 프로토콜 메시지 처리
        if (event.data && typeof event.data === 'object' && event.data.type === 'CDP_MESSAGE') {
            if (this.onMessage) {
                this.onMessage.call(null, event.data.message);
            }
        }
    }
    setOnMessage(onMessage) {
        this.onMessage = onMessage;
    }
    setOnDisconnect(onDisconnect) {
        this.#onDisconnect = onDisconnect;
    }
    /**
     * Send CDP message to parent/opener window / 부모/열린 창에 CDP 메시지 전송
     */
    sendRawMessage(message) {
        if (this.#targetWindow && this.#ready) {
            const cdpMessage = { type: 'CDP_MESSAGE', message };
            this.#targetWindow.postMessage(cdpMessage, '*');
        }
    }
    async disconnect() {
        window.removeEventListener('message', this.#messageHandler);
        if (this.#onDisconnect) {
            this.#onDisconnect.call(null, 'force disconnect');
        }
        this.#onDisconnect = null;
        this.onMessage = null;
        this.#targetWindow = null;
        this.#ready = false;
    }
}
//# sourceMappingURL=PostMessageTransport.js.map