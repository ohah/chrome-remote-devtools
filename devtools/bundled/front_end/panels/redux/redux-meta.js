// gen/front_end/panels/redux/redux-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Label for the Redux pane / Redux 패널 레이블
   */
  redux: "Redux",
  /**
   * @description Command for showing the 'Redux' pane / 'Redux' 패널 표시 명령
   */
  showRedux: "Show Redux"
};
var str_ = i18n.i18n.registerUIStrings("panels/redux/redux-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedReduxModule;
async function loadReduxModule() {
  if (!loadedReduxModule) {
    loadedReduxModule = await import("./redux.js");
  }
  return loadedReduxModule;
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "redux-view",
  title: i18nLazyString(UIStrings.redux),
  commandPrompt: i18nLazyString(UIStrings.showRedux),
  order: 1001,
  persistence: "permanent",
  hasToolbar: false,
  async loadView() {
    const Redux = await loadReduxModule();
    return new Redux.ReduxPanel.ReduxPanel();
  }
});
//# sourceMappingURL=redux-meta.js.map
