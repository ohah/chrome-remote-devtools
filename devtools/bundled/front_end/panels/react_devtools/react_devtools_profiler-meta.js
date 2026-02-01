// gen/front_end/panels/react_devtools/react_devtools_profiler-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description React DevTools panel title
   */
  title: "Profiler \u269B",
  /**
   * @description Command for showing the React DevTools panel
   */
  command: "Show React DevTools Profiler panel"
};
var str_ = i18n.i18n.registerUIStrings("panels/react_devtools/react_devtools_profiler-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedModule;
async function loadModule() {
  if (!loadedModule) {
    loadedModule = await import("./react_devtools.js");
  }
  return loadedModule;
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "react-devtools-profiler",
  title: i18nLazyString(UIStrings.title),
  commandPrompt: i18nLazyString(UIStrings.command),
  persistence: "permanent",
  order: 1011,
  condition: () => {
    const clientType = Root.Runtime.Runtime.queryParam("clientType");
    if (clientType === "react-native" || clientType === "reactotron") {
      return true;
    }
    const clientId = Root.Runtime.Runtime.queryParam("clientId");
    return typeof clientId === "string" && clientId.startsWith("rn-inspector-");
  },
  async loadView() {
    const Module = await loadModule();
    return new Module.ReactDevToolsProfilerView.ReactDevToolsProfilerViewImpl();
  }
});
//# sourceMappingURL=react_devtools_profiler-meta.js.map
