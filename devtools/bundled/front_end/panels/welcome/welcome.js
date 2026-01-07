var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/welcome/WelcomePanel.js
var WelcomePanel_exports = {};
__export(WelcomePanel_exports, {
  WelcomePanel: () => WelcomePanel
});
import * as UI from "./../../ui/legacy/legacy.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as UIHelpers from "./../../ui/helpers/helpers.js";
import { html, render } from "./../../ui/lit/lit.js";
import "./../../ui/kit/kit.js";
var UIStrings = {
  /**
   * @description Title of the Welcome panel
   */
  welcomeTitle: "Welcome to Chrome Remote DevTools",
  /**
   * @description Subtitle in the Welcome panel
   */
  welcomeSubtitle: "Welcome to debugging in Chrome DevTools",
  /**
   * @description Link text for documentation
   */
  documentation: "Documentation",
  /**
   * @description Link text for GitHub repository
   */
  github: "GitHub"
};
var str_ = i18n.i18n.registerUIStrings("panels/welcome/WelcomePanel.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var welcomePanelInstance;
var WelcomePanel = class _WelcomePanel extends UI.Panel.Panel {
  constructor() {
    super("welcome");
    this.render();
  }
  render() {
    const container = document.createElement("div");
    container.className = "welcome-panel";
    const openDocumentation = () => {
      UIHelpers.openInNewTab("https://ohah.github.io/chrome-remote-devtools");
    };
    const openGitHub = () => {
      UIHelpers.openInNewTab("https://github.com/ohah/chrome-remote-devtools");
    };
    render(html`
      <style>
        .welcome-panel {
          padding: 48px 32px;
          max-width: 800px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .welcome-header {
          text-align: center;
        }
        .welcome-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 24px;
          color: var(--color-primary);
          font-size: 64px;
          line-height: 1;
        }
        .welcome-title {
          font-size: 32px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--color-text-primary);
          line-height: 1.2;
        }
        .welcome-subtitle {
          font-size: 16px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .welcome-links {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .welcome-link {
          color: var(--color-primary);
          text-decoration: none;
          font-size: 14px;
          cursor: pointer;
        }
        .welcome-link:hover {
          text-decoration: underline;
        }
      </style>
      <div class="welcome-header">
        <div class="welcome-icon">⚙️</div>
        <h1 class="welcome-title">${i18nString(UIStrings.welcomeTitle)}</h1>
        <p class="welcome-subtitle">${i18nString(UIStrings.welcomeSubtitle)}</p>
        <div class="welcome-links">
          <a class="welcome-link" @click=${openDocumentation}>${i18nString(UIStrings.documentation)}</a>
          <a class="welcome-link" @click=${openGitHub}>${i18nString(UIStrings.github)}</a>
        </div>
      </div>
    `, container);
    this.contentElement.appendChild(container);
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!welcomePanelInstance || forceNew) {
      welcomePanelInstance = new _WelcomePanel();
    }
    return welcomePanelInstance;
  }
};
export {
  WelcomePanel_exports as WelcomePanel
};
//# sourceMappingURL=welcome.js.map
