// gen/front_end/panels/plugins/plugins-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Title of the Redux DevTools plugin panel / Redux DevTools 플러그인 패널 제목
   */
  reduxPlugin: "\u{1F9E9} Redux",
  /**
   * @description Command for showing the Redux DevTools plugin panel / Redux DevTools 플러그인 패널 표시 명령
   */
  showReduxPlugin: "Show Redux"
};
var str_ = i18n.i18n.registerUIStrings("panels/plugins/plugins-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var DynamicPluginPanel = class extends UI.Panel.Panel {
  #iframe;
  constructor(config) {
    super(config.id);
    this.setHideOnDetach();
    const remoteBase = Root.Runtime.getRemoteBase();
    const panelUrl = remoteBase ? `${remoteBase.base}panels/plugins/${config.htmlFile}` : `${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/panels/plugins/${config.htmlFile}`;
    this.#iframe = document.createElement("iframe");
    this.#iframe.src = panelUrl;
    this.#iframe.style.width = "100%";
    this.#iframe.style.height = "100%";
    this.#iframe.style.border = "none";
    this.contentElement.appendChild(this.#iframe);
  }
  wasShown() {
    super.wasShown();
  }
  willHide() {
    super.willHide();
  }
};
var PLUGIN_PANELS = [
  // Redux DevTools plugin / Redux DevTools 플러그인
  {
    id: "redux-plugin",
    title: i18nLazyString(UIStrings.reduxPlugin),
    commandPrompt: i18nLazyString(UIStrings.showReduxPlugin),
    htmlFile: "redux-plugin/index.html",
    order: 2001
  }
];
for (const config of PLUGIN_PANELS) {
  UI.ViewManager.registerViewExtension({
    location: "panel",
    id: config.id,
    title: config.title,
    commandPrompt: config.commandPrompt,
    order: config.order ?? 2e3,
    persistence: "closeable",
    async loadView() {
      return new DynamicPluginPanel(config);
    }
  });
}
//# sourceMappingURL=plugins-meta.js.map
