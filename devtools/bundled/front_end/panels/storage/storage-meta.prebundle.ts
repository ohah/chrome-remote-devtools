// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Storage from './storage.js';

const UIStrings = {
  /**
   * @description Label for the MMKV pane / MMKV 패널 레이블
   */
  mmkv: 'MMKV',
  /**
   * @description Command for showing the 'MMKV' pane / 'MMKV' 패널 표시 명령
   */
  showMMKV: 'Show MMKV',
  /**
   * @description Label for the AsyncStorage pane / AsyncStorage 패널 레이블
   */
  asyncStorage: 'AsyncStorage',
  /**
   * @description Command for showing the 'AsyncStorage' pane / 'AsyncStorage' 패널 표시 명령
   */
  showAsyncStorage: 'Show AsyncStorage',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/storage/storage-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedStorageModule: (typeof Storage|undefined);

async function loadStorageModule(): Promise<typeof Storage> {
  if (!loadedStorageModule) {
    loadedStorageModule = await import('./storage.js');
  }
  return loadedStorageModule;
}

function storageCondition(): boolean {
  const clientType = Root.Runtime.Runtime.queryParam('clientType');
  return clientType === 'react-native';
}

// MMKV panel / MMKV 패널
UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'storage-mmkv-view',
  title: i18nLazyString(UIStrings.mmkv),
  commandPrompt: i18nLazyString(UIStrings.showMMKV),
  order: 1003,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: false,
  condition: storageCondition,
  async loadView() {
    const Storage = await loadStorageModule();
    return Storage.StoragePanel.MMKVStoragePanel.instance();
  },
});

// AsyncStorage panel / AsyncStorage 패널
UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'storage-async-storage-view',
  title: i18nLazyString(UIStrings.asyncStorage),
  commandPrompt: i18nLazyString(UIStrings.showAsyncStorage),
  order: 1004,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  hasToolbar: false,
  condition: storageCondition,
  async loadView() {
    const Storage = await loadStorageModule();
    return Storage.StoragePanel.AsyncStorageStoragePanel.instance();
  },
});
