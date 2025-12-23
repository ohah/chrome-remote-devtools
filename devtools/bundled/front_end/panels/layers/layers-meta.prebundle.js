// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Title of the Layers tool
     */
    layers: 'Layers',
    /**
     * @description Command for showing the Layers tool
     */
    showLayers: 'Show Layers',
};
const str_ = i18n.i18n.registerUIStrings('panels/layers/layers-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedLayersModule;
async function loadLayersModule() {
    if (!loadedLayersModule) {
        loadedLayersModule = await import('./layers.js');
    }
    return loadedLayersModule;
}
// Chrome Remote DevTools: 지원하지 않는 패널이므로 등록하지 않음
// UI.ViewManager.registerViewExtension({
//   location: UI.ViewManager.ViewLocationValues.PANEL,
//   id: 'layers',
//   title: i18nLazyString(UIStrings.layers),
//   commandPrompt: i18nLazyString(UIStrings.showLayers),
//   order: 100,
//   persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
//   async loadView() {
//     const Layers = await loadLayersModule();
//     return Layers.LayersPanel.LayersPanel.instance();
//   },
// });
//# sourceMappingURL=layers-meta.prebundle.js.map