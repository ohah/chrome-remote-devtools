// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as SessionReplay from './session_replay.js';

const UIStrings = {
  /**
   * @description Title of the Session Replay panel
   */
  sessionReplay: 'Session Replay',
  /**
   * @description Command for showing the Session Replay panel
   */
  showSessionReplay: 'Show Session Replay',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/session_replay/session_replay-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSessionReplayModule: (typeof SessionReplay|undefined);

async function loadSessionReplayModule(): Promise<typeof SessionReplay> {
  if (!loadedSessionReplayModule) {
    loadedSessionReplayModule = await import('./session_replay.js');
  }
  return loadedSessionReplayModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'session-replay',
  commandPrompt: i18nLazyString(UIStrings.showSessionReplay),
  title: i18nLazyString(UIStrings.sessionReplay),
  order: 1000,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: false,
  condition: () => {
    // Hide for React Native / React Native에서는 숨김
    const clientType = Root.Runtime.Runtime.queryParam('clientType');
    return clientType !== 'react-native';
  },
  async loadView() {
    const SessionReplay = await loadSessionReplayModule();
    return SessionReplay.SessionReplayPanel.SessionReplayPanel.instance();
  },
});

