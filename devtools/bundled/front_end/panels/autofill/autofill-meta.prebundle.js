// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Label for the autofill pane
     */
    autofill: 'Autofill',
    /**
     * @description Command for showing the 'Autofill' pane
     */
    showAutofill: 'Show Autofill',
};
const str_ = i18n.i18n.registerUIStrings('panels/autofill/autofill-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedAutofillModule;
async function loadAutofillModule() {
    if (!loadedAutofillModule) {
        loadedAutofillModule = await import('./autofill.js');
    }
    return loadedAutofillModule;
}
// Chrome Remote DevTools: 지원하지 않는 패널이므로 등록하지 않음
// UI.ViewManager.registerViewExtension({
//   location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
//   id: 'autofill-view',
//   title: i18nLazyString(UIStrings.autofill),
//   commandPrompt: i18nLazyString(UIStrings.showAutofill),
//   order: 100,
//   persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
//   async loadView() {
//     const Autofill = await loadAutofillModule();
//     return new Autofill.AutofillView.AutofillView();
//   },
// });
//# sourceMappingURL=autofill-meta.prebundle.js.map