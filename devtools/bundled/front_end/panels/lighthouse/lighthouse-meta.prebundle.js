// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Command for showing the 'Lighthouse' tool
     */
    showLighthouse: 'Show `Lighthouse`',
};
const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/lighthouse-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedLighthouseModule;
async function loadLighthouseModule() {
    if (!loadedLighthouseModule) {
        loadedLighthouseModule = await import('./lighthouse.js');
    }
    return loadedLighthouseModule;
}
// Chrome Remote DevTools: 지원하지 않는 패널이므로 등록하지 않음
// UI.ViewManager.registerViewExtension({
//   location: UI.ViewManager.ViewLocationValues.PANEL,
//   id: 'lighthouse',
//   title: i18n.i18n.lockedLazyString('Lighthouse'),
//   commandPrompt: i18nLazyString(UIStrings.showLighthouse),
//   order: 90,
//   async loadView() {
//     const Lighthouse = await loadLighthouseModule();
//     return Lighthouse.LighthousePanel.LighthousePanel.instance();
//   },
//   tags: [
//     i18n.i18n.lockedLazyString('lighthouse'),
//     i18n.i18n.lockedLazyString('pwa'),
//   ],
// });
//# sourceMappingURL=lighthouse-meta.prebundle.js.map