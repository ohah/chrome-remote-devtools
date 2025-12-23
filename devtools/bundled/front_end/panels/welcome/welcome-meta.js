// gen/front_end/panels/welcome/welcome-meta.prebundle.js
import * as i18n from "./..\\..\\core\\i18n\\i18n.js";
import * as UI from "./..\\..\\ui\\legacy\\legacy.js";
var UIStrings = {
  /**
   * @description Title of the Welcome panel
   */
  welcome: "Welcome",
  /**
   * @description Command for showing the Welcome panel
   */
  showWelcome: "Show Welcome"
};
var str_ = i18n.i18n.registerUIStrings("panels/welcome/welcome-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedWelcomeModule;
async function loadWelcomeModule() {
  if (!loadedWelcomeModule) {
    loadedWelcomeModule = await import("./welcome.js");
  }
  return loadedWelcomeModule;
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "welcome",
  commandPrompt: i18nLazyString(UIStrings.showWelcome),
  title: i18nLazyString(UIStrings.welcome),
  order: 5,
  // Elements (order: 10)보다 앞에 표시
  persistence: "permanent",
  hasToolbar: false,
  async loadView() {
    const Welcome = await loadWelcomeModule();
    return Welcome.WelcomePanel.WelcomePanel.instance();
  }
});
//# sourceMappingURL=welcome-meta.js.map
