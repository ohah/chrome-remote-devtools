// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Label for the Redux pane / Redux 패널 레이블
     */
    redux: 'Redux',
    /**
     * @description Command for showing the 'Redux' pane / 'Redux' 패널 표시 명령
     */
    showRedux: 'Show Redux',
};
const str_ = i18n.i18n.registerUIStrings('panels/redux/redux-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedReduxModule;
async function loadReduxModule() {
    if (!loadedReduxModule) {
        loadedReduxModule = await import('./redux.js');
    }
    return loadedReduxModule;
}
UI.ViewManager.registerViewExtension({
    location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
    id: 'redux-view',
    title: i18nLazyString(UIStrings.redux),
    commandPrompt: i18nLazyString(UIStrings.showRedux),
    order: 1001,
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    hasToolbar: false,
    async loadView() {
        const Redux = await loadReduxModule();
        return new Redux.ReduxPanel.ReduxPanel();
    },
});
//# sourceMappingURL=redux-meta.prebundle.js.map