// gen/front_end/panels/storage/storage-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Label for the Storage pane / Storage 패널 레이블
   */
  storage: "Storage",
  /**
   * @description Command for showing the 'Storage' pane / 'Storage' 패널 표시 명령
   */
  showStorage: "Show Storage"
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
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "storage-view",
  title: i18nLazyString(UIStrings.storage),
  commandPrompt: i18nLazyString(UIStrings.showStorage),
  order: 1003,
  persistence: "permanent",
  hasToolbar: false,
  condition: () => {
    const clientType = Root.Runtime.Runtime.queryParam("clientType");
    return clientType === "react-native";
  },
  async loadView() {
    const Storage = await loadStorageModule();
    return Storage.StoragePanel.StoragePanel.instance();
  }
});
//# sourceMappingURL=storage-meta.js.map
