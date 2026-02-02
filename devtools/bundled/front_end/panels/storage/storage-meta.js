// gen/front_end/panels/storage/storage-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Label for the MMKV pane / MMKV 패널 레이블
   */
  mmkv: "MMKV",
  /**
   * @description Command for showing the 'MMKV' pane / 'MMKV' 패널 표시 명령
   */
  showMMKV: "Show MMKV",
  /**
   * @description Label for the AsyncStorage pane / AsyncStorage 패널 레이블
   */
  asyncStorage: "AsyncStorage",
  /**
   * @description Command for showing the 'AsyncStorage' pane / 'AsyncStorage' 패널 표시 명령
   */
  showAsyncStorage: "Show AsyncStorage"
};
var str_ = i18n.i18n.registerUIStrings("panels/storage/storage-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedStorageModule;
async function loadStorageModule() {
  if (!loadedStorageModule) {
    loadedStorageModule = await import("./storage.js");
  }
  return loadedStorageModule;
}
function storageCondition() {
  const clientType = Root.Runtime.Runtime.queryParam("clientType");
  return clientType === "react-native";
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "storage-mmkv-view",
  title: i18nLazyString(UIStrings.mmkv),
  commandPrompt: i18nLazyString(UIStrings.showMMKV),
  order: 1003,
  persistence: "permanent",
  hasToolbar: false,
  condition: storageCondition,
  async loadView() {
    const Storage = await loadStorageModule();
    return Storage.StoragePanel.MMKVStoragePanel.instance();
  }
});
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "storage-async-storage-view",
  title: i18nLazyString(UIStrings.asyncStorage),
  commandPrompt: i18nLazyString(UIStrings.showAsyncStorage),
  order: 1004,
  persistence: "permanent",
  hasToolbar: false,
  condition: storageCondition,
  async loadView() {
    const Storage = await loadStorageModule();
    return Storage.StoragePanel.AsyncStorageStoragePanel.instance();
  }
});
//# sourceMappingURL=storage-meta.js.map
