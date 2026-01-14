// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Redux from './redux.js';
import { initializeReduxBridge } from './ReduxExtensionBridge.js';

// Initialize Redux bridge when this module loads / 이 모듈이 로드될 때 Redux bridge 초기화
// This ensures messages are buffered even before panel is opened / 패널이 열리기 전에도 메시지가 버퍼링되도록 보장
// Wait for TargetManager to be ready / TargetManager가 준비될 때까지 대기
setTimeout(() => {
  if (SDK.TargetManager.TargetManager.instance()) {
    initializeReduxBridge();
  }
}, 100);

const UIStrings = {
  /**
   * @description Label for the Redux pane / Redux 패널 레이블
   */
  redux: 'Redux',
  /**
   * @description Command for showing the 'Redux' pane / 'Redux' 패널 표시 명령
   */
  showRedux: 'Show Redux',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/redux/redux-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedReduxModule: (typeof Redux|undefined);

async function loadReduxModule(): Promise<typeof Redux> {
  if (!loadedReduxModule) {
    loadedReduxModule = await import('./redux.js');
  }
  return loadedReduxModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'redux-view',
  title: i18nLazyString(UIStrings.redux),
  commandPrompt: i18nLazyString(UIStrings.showRedux),
  order: 1001,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: false,
  condition: () => {
    // Show only for React Native / React Native에서만 표시
    const clientType = Root.Runtime.Runtime.queryParam('clientType');
    return clientType === 'react-native';
  },
  async loadView() {
    const Redux = await loadReduxModule();
    return new Redux.ReduxPanel.ReduxPanel();
  },
});

