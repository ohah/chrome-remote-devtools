// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Title of the Session Replay panel
     */
    sessionReplay: 'Session Replay',
    /**
     * @description Command for showing the Session Replay panel
     */
    showSessionReplay: 'Show Session Replay',
};
const str_ = i18n.i18n.registerUIStrings('panels/session_replay/session_replay-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedSessionReplayModule;
async function loadSessionReplayModule() {
    if (!loadedSessionReplayModule) {
        loadedSessionReplayModule = await import('./session_replay.js');
    }
    return loadedSessionReplayModule;
}
UI.ViewManager.registerViewExtension({
    location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
    id: 'session-replay',
    commandPrompt: i18nLazyString(UIStrings.showSessionReplay),
    title: i18nLazyString(UIStrings.sessionReplay),
    order: 1000,
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    hasToolbar: false,
    async loadView() {
        const SessionReplay = await loadSessionReplayModule();
        return SessionReplay.SessionReplayPanel.SessionReplayPanel.instance();
    },
});
//# sourceMappingURL=session_replay-meta.prebundle.js.map