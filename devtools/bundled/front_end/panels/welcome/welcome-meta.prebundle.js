// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Title of the Welcome panel
     */
    welcome: 'Welcome',
    /**
     * @description Command for showing the Welcome panel
     */
    showWelcome: 'Show Welcome',
};
const str_ = i18n.i18n.registerUIStrings('panels/welcome/welcome-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedWelcomeModule;
async function loadWelcomeModule() {
    if (!loadedWelcomeModule) {
        loadedWelcomeModule = await import('./welcome.js');
    }
    return loadedWelcomeModule;
}
UI.ViewManager.registerViewExtension({
    location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
    id: 'welcome',
    commandPrompt: i18nLazyString(UIStrings.showWelcome),
    title: i18nLazyString(UIStrings.welcome),
    order: 5, // Elements (order: 10)보다 앞에 표시
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    hasToolbar: false,
    async loadView() {
        const Welcome = await loadWelcomeModule();
        return Welcome.WelcomePanel.WelcomePanel.instance();
    },
});
//# sourceMappingURL=welcome-meta.prebundle.js.map