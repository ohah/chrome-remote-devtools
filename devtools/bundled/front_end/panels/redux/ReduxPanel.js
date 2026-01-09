// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Root from '../../core/root/root.js';
import { ReduxExtensionBridge } from './ReduxExtensionBridge.js';
export class ReduxPanel extends UI.Panel.Panel {
    #iframe = null;
    #bridge;
    #target = null;
    constructor() {
        super('redux');
        this.setHideOnDetach();
        this.#bridge = new ReduxExtensionBridge();
        // Create iframe directly / iframe 직접 생성
        this.#iframe = document.createElement('iframe');
        this.#iframe.className = 'redux-devtools-iframe';
        this.#iframe.style.width = '100%';
        this.#iframe.style.height = '100%';
        this.#iframe.style.border = 'none';
        // Build URL for devpanel.html / devpanel.html URL 구성
        // Use the same base URL as the current page / 현재 페이지와 동일한 base URL 사용
        const remoteBase = Root.Runtime.getRemoteBase();
        let reduxDevToolsPage;
        if (remoteBase) {
            // Use remote base if available / remote base가 있으면 사용
            reduxDevToolsPage = `${remoteBase.base}panels/redux/extension/devpanel.html`;
        }
        else {
            // Fallback to relative path / 상대 경로로 폴백
            const currentPath = window.location.pathname;
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            reduxDevToolsPage = `${basePath}/panels/redux/extension/devpanel.html`;
        }
        this.#iframe.src = reduxDevToolsPage;
        this.#iframe.onload = () => {
            if (this.#iframe?.contentWindow) {
                this.#bridge.initialize(this.#iframe.contentWindow);
            }
        };
        this.contentElement.appendChild(this.#iframe);
        // Setup CDP listener / CDP 리스너 설정
        this.setupCDPListener();
    }
    wasShown() {
        super.wasShown();
        this.setupCDPListener();
        // When panel is shown, ensure START message is sent / 패널이 표시될 때 START 메시지가 전송되도록 보장
        // This handles the case where Extension didn't call connect / Extension이 connect를 호출하지 않은 경우 처리
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
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!target) {
            SDK.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged" /* SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED */, () => {
                const newTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
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
        // Redux CDP 이벤트를 bridge로 전달 / Redux CDP 이벤트를 bridge로 전달
        this.#bridge.attachToTarget(target, router.connection);
    }
    cleanupCDPListener() {
        this.#bridge.cleanup();
    }
}
//# sourceMappingURL=ReduxPanel.js.map