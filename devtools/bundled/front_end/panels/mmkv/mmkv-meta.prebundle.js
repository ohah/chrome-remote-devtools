// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Label for the MMKV pane / MMKV 패널 레이블
     */
    mmkv: 'MMKV',
    /**
     * @description Command for showing the 'MMKV' pane / 'MMKV' 패널 표시 명령
     */
    showMMKV: 'Show MMKV',
};
const str_ = i18n.i18n.registerUIStrings('panels/mmkv/mmkv-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedMMKVModule;
async function loadMMKVModule() {
    if (!loadedMMKVModule) {
        loadedMMKVModule = await import('./mmkv.js');
    }
    return loadedMMKVModule;
}
function mmkvCondition() {
    const clientType = Root.Runtime.Runtime.queryParam('clientType');
    return clientType === 'react-native';
}
UI.ViewManager.registerViewExtension({
    location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
    id: 'mmkv-view',
    title: i18nLazyString(UIStrings.mmkv),
    commandPrompt: i18nLazyString(UIStrings.showMMKV),
    order: 1003,
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    hasToolbar: false,
    condition: mmkvCondition,
    async loadView() {
        const MMKV = await loadMMKVModule();
        return MMKV.MMKVPanel.instance();
    },
});
//# sourceMappingURL=mmkv-meta.prebundle.js.map