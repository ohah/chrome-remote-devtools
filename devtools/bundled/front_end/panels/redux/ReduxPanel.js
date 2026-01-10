// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Root from '../../core/root/root.js';
import { getReduxExtensionBridge, initializeReduxBridge } from './ReduxExtensionBridge.js';
export class ReduxPanel extends UI.Panel.Panel {
    #iframe = null;
    #bridge;
    constructor() {
        super('redux');
        this.setHideOnDetach();
        // Initialize global bridge if not already / 전역 bridge 초기화 (아직 안 되었으면)
        initializeReduxBridge();
        // Use global singleton bridge / 전역 싱글톤 bridge 사용
        this.#bridge = getReduxExtensionBridge();
        // Create iframe directly / iframe 직접 생성
        this.#iframe = document.createElement('iframe');
        this.#iframe.className = 'redux-devtools-iframe';
        this.#iframe.style.width = '100%';
        this.#iframe.style.height = '100%';
        this.#iframe.style.border = 'none';
        // Build URL for plugin HTML / 플러그인 HTML URL 구성
        // Use the same base URL as the current page / 현재 페이지와 동일한 base URL 사용
        const remoteBase = Root.Runtime.getRemoteBase();
        let reduxDevToolsPage;
        if (remoteBase) {
            // Use remote base if available / remote base가 있으면 사용
            reduxDevToolsPage = `${remoteBase.base}panels/plugins/redux-plugin/index.html`;
        }
        else {
            // Fallback to relative path / 상대 경로로 폴백
            const currentPath = window.location.pathname;
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            reduxDevToolsPage = `${basePath}/panels/plugins/redux-plugin/index.html`;
        }
        this.#iframe.src = reduxDevToolsPage;
        this.#iframe.onload = () => {
            if (this.#iframe?.contentWindow) {
                // Wait a bit for iframe content to fully load / iframe 콘텐츠가 완전히 로드될 때까지 약간 대기
                setTimeout(() => {
                    if (this.#iframe?.contentWindow) {
                        // Initialize iframe window - this will flush buffered messages / iframe window 초기화 - 버퍼된 메시지가 전송됨
                        this.#bridge.initialize(this.#iframe.contentWindow);
                    }
                }, 100);
            }
        };
        this.contentElement.appendChild(this.#iframe);
    }
    wasShown() {
        super.wasShown();
        // When panel is shown, flush buffered messages again for new connections / 패널이 표시될 때 새 연결을 위해 버퍼된 메시지를 다시 플러싱
        // This ensures history is sent when panel is reopened / 패널이 다시 열릴 때 히스토리가 전송되도록 보장
        if (this.#iframe?.contentWindow) {
            // Re-initialize to flush buffer / 버퍼를 플러싱하기 위해 재초기화
            this.#bridge.initialize(this.#iframe.contentWindow);
        }
        // When panel is shown, ensure START message is sent / 패널이 표시될 때 START 메시지가 전송되도록 보장
        // This handles the case where Extension didn't call connect / Extension이 connect를 호출하지 않은 경우 처리
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (this.#iframe?.contentWindow && target) {
            setTimeout(() => {
                this.#bridge.sendStartMessageToPageIfNeeded();
            }, 500);
        }
    }
    willHide() {
        super.willHide();
        // Don't cleanup - bridge is global and keeps listening / 정리하지 않음 - bridge는 전역이고 계속 리스닝
    }
}
//# sourceMappingURL=ReduxPanel.js.map