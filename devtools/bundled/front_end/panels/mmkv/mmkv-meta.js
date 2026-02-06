// gen/front_end/panels/mmkv/mmkv-meta.prebundle.js
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
  showMMKV: "Show MMKV"
};
var str_ = i18n.i18n.registerUIStrings("panels/mmkv/mmkv-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedMMKVModule;
async function loadMMKVModule() {
  if (!loadedMMKVModule) {
    loadedMMKVModule = await import("./mmkv.js");
  }
  return loadedMMKVModule;
}
function mmkvCondition() {
  const clientType = Root.Runtime.Runtime.queryParam("clientType");
  return clientType === "react-native";
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "mmkv-view",
  title: i18nLazyString(UIStrings.mmkv),
  commandPrompt: i18nLazyString(UIStrings.showMMKV),
  order: 1003,
  persistence: "permanent",
  hasToolbar: false,
  condition: mmkvCondition,
  async loadView() {
    const MMKV = await loadMMKVModule();
    return MMKV.MMKVPanel.instance();
  }
});
//# sourceMappingURL=mmkv-meta.js.map
