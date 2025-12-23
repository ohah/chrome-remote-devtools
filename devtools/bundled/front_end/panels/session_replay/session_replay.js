var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/session_replay/SessionReplayPanel.js
var SessionReplayPanel_exports = {};
__export(SessionReplayPanel_exports, {
  SessionReplayPanel: () => SessionReplayPanel
});
import * as UI from "./..\\..\\ui\\legacy\\legacy.js";
var sessionReplayPanelInstance;
var SessionReplayPanel = class _SessionReplayPanel extends UI.Panel.Panel {
  constructor() {
    super("session-replay");
    this.render();
  }
  render() {
    const container = document.createElement("div");
    container.className = "session-replay-panel";
    this.contentElement.appendChild(container);
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!sessionReplayPanelInstance || forceNew) {
      sessionReplayPanelInstance = new _SessionReplayPanel();
    }
    return sessionReplayPanelInstance;
  }
};
export {
  SessionReplayPanel_exports as SessionReplayPanel
};
//# sourceMappingURL=session_replay.js.map
