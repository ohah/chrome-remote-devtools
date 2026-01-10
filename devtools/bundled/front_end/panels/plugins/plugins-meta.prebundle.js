// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Dynamic plugin panel loader / 동적 플러그인 패널 로더
// Registers plugin panels from panels/plugins directory / panels/plugins 디렉토리에서 플러그인 패널 등록
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Title of the Redux DevTools plugin panel / Redux DevTools 플러그인 패널 제목
     */
    reduxPlugin: '🧩 Redux',
    /**
     * @description Command for showing the Redux DevTools plugin panel / Redux DevTools 플러그인 패널 표시 명령
     */
    showReduxPlugin: 'Show Redux',
};
const str_ = i18n.i18n.registerUIStrings('panels/plugins/plugins-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
/**
 * Dynamic iframe panel class / 동적 iframe 패널 클래스
 * Loads plugin HTML in iframe / 플러그인 HTML을 iframe에 로드
 */
class DynamicPluginPanel extends UI.Panel.Panel {
    #iframe;
    constructor(config) {
        super(config.id);
        this.setHideOnDetach();
        // Build URL for HTML file / HTML 파일 URL 구성
        const remoteBase = Root.Runtime.getRemoteBase();
        const panelUrl = remoteBase
            ? `${remoteBase.base}panels/plugins/${config.htmlFile}`
            : `${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))}/panels/plugins/${config.htmlFile}`;
        // Create iframe / iframe 생성
        this.#iframe = document.createElement('iframe');
        this.#iframe.src = panelUrl;
        this.#iframe.style.width = '100%';
        this.#iframe.style.height = '100%';
        this.#iframe.style.border = 'none';
        this.contentElement.appendChild(this.#iframe);
    }
    wasShown() {
        super.wasShown();
    }
    willHide() {
        super.willHide();
    }
}
/**
 * Plugin panel configurations / 플러그인 패널 설정
 */
const PLUGIN_PANELS = [
    // Redux DevTools plugin / Redux DevTools 플러그인
    {
        id: 'redux-plugin',
        title: i18nLazyString(UIStrings.reduxPlugin),
        commandPrompt: i18nLazyString(UIStrings.showReduxPlugin),
        htmlFile: 'redux-plugin/index.html',
        order: 2001,
    },
];
/**
 * Register all plugin panels / 모든 플러그인 패널 등록
 */
for (const config of PLUGIN_PANELS) {
    UI.ViewManager.registerViewExtension({
        location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
        id: config.id,
        title: config.title,
        commandPrompt: config.commandPrompt,
        order: config.order ?? 2000,
        persistence: "closeable" /* UI.ViewManager.ViewPersistence.CLOSEABLE */,
        async loadView() {
            return new DynamicPluginPanel(config);
        },
    });
}
//# sourceMappingURL=plugins-meta.prebundle.js.map