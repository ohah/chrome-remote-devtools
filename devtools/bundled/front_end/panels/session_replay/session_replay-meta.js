// gen/front_end/panels/session_replay/session_replay-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Title of the Session Replay panel
   */
  sessionReplay: "Session Replay",
  /**
   * @description Command for showing the Session Replay panel
   */
  showSessionReplay: "Show Session Replay"
};
var str_ = i18n.i18n.registerUIStrings("panels/session_replay/session_replay-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedSessionReplayModule;
async function loadSessionReplayModule() {
  if (!loadedSessionReplayModule) {
    loadedSessionReplayModule = await import("./session_replay.js");
  }
  return loadedSessionReplayModule;
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "session-replay",
  commandPrompt: i18nLazyString(UIStrings.showSessionReplay),
  title: i18nLazyString(UIStrings.sessionReplay),
  order: 1e3,
  persistence: "permanent",
  hasToolbar: false,
  async loadView() {
    const SessionReplay = await loadSessionReplayModule();
    return SessionReplay.SessionReplayPanel.SessionReplayPanel.instance();
  }
});
//# sourceMappingURL=session_replay-meta.js.map
