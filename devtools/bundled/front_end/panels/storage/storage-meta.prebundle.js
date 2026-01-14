// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Label for the Storage pane / Storage 패널 레이블
     */
    storage: 'Storage',
    /**
     * @description Command for showing the 'Storage' pane / 'Storage' 패널 표시 명령
     */
    showStorage: 'Show Storage',
};
const str_ = i18n.i18n.registerUIStrings('panels/storage/storage-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedStorageModule;
async function loadStorageModule() {
    if (!loadedStorageModule) {
        loadedStorageModule = await import('./storage.js');
    }
    return loadedStorageModule;
}
UI.ViewManager.registerViewExtension({
    location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
    id: 'storage-view',
    title: i18nLazyString(UIStrings.storage),
    commandPrompt: i18nLazyString(UIStrings.showStorage),
    order: 1003,
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    hasToolbar: false,
    condition: () => {
        // Show only for React Native / React Native에서만 표시
        const clientType = Root.Runtime.Runtime.queryParam('clientType');
        return clientType === 'react-native';
    },
    async loadView() {
        const Storage = await loadStorageModule();
        return Storage.StoragePanel.StoragePanel.instance();
    },
});
//# sourceMappingURL=storage-meta.prebundle.js.map