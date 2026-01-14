var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/welcome/WelcomePanel.js
var WelcomePanel_exports = {};
__export(WelcomePanel_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  WelcomePanel: () => WelcomePanel
});
import * as i18n from "./../../core/i18n/i18n.js";
import * as UI from "./../../ui/legacy/legacy.js";
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
  github: "GitHub",
  /**
   * @description React Native support card title
   */
  reactNativeTitle: "React Native Support",
  /**
   * @description React Native support card description
   */
  reactNativeDescription: "Debug React Native apps with full DevTools integration. Monitor network requests, console logs, and Redux state in real-time.",
  /**
   * @description Web support card title
   */
  webTitle: "Web Support",
  /**
   * @description Web support card description
   */
  webDescription: "Debug web applications remotely with Chrome DevTools. Inspect elements, monitor network, and profile performance seamlessly."
};
var str_ = i18n.i18n.registerUIStrings("panels/welcome/WelcomePanel.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var welcomePanelInstance;
var DEFAULT_VIEW = (_input, _output, target) => {
  render(html`
    <div>
      <div></div>
    </div>`, target, { host: _input });
};
var WelcomePanel = class _WelcomePanel extends UI.Panel.Panel {
  constructor() {
    super("welcome");
    this.render();
  }
  render() {
    this.contentElement.style.display = "flex";
    this.contentElement.style.justifyContent = "center";
    this.contentElement.style.width = "100%";
    this.contentElement.style.boxSizing = "border-box";
    this.contentElement.style.padding = "0 24px";
    const container = document.createElement("div");
    container.className = "welcome-panel";
    render(html`
      <style>
        .welcome-panel {
          padding: 48px 32px;
          max-width: 800px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, sans-serif;
          width: 100%;
          box-sizing: border-box;
        }
        .welcome-header {
          text-align: center;
          width: 100%;
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
        .welcome-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-top: 48px;
          width: 100%;
          max-width: 100%;
        }
        .welcome-card {
          background: var(--color-background-elevation-1);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 24px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .welcome-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .welcome-card-title {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 12px;
          color: var(--color-text-primary);
        }
        .welcome-card-description {
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-text-secondary);
        }
      </style>
      <div class="welcome-header">
        <div class="welcome-icon">⚙️</div>
        <h1 class="welcome-title">${i18nString(UIStrings.welcomeTitle)}</h1>
        <p class="welcome-subtitle">${i18nString(UIStrings.welcomeSubtitle)}</p>
        <div class="welcome-links">
          <!-- eslint-disable-next-line @devtools/no-a-tags-in-lit -->
          <a href="https://ohah.github.io/chrome-remote-devtools" target="_blank" rel="noopener noreferrer" class="welcome-link">${i18nString(UIStrings.documentation)}</a>
          <!-- eslint-disable-next-line @devtools/no-a-tags-in-lit -->
          <a href="https://github.com/ohah/chrome-remote-devtools" target="_blank" rel="noopener noreferrer" class="welcome-link">${i18nString(UIStrings.github)}</a>
        </div>
      </div>
      <div class="welcome-cards">
        <div class="welcome-card">
          <div class="welcome-card-title">${i18nString(UIStrings.reactNativeTitle)}</div>
          <div class="welcome-card-description">${i18nString(UIStrings.reactNativeDescription)}</div>
        </div>
        <div class="welcome-card">
          <div class="welcome-card-title">${i18nString(UIStrings.webTitle)}</div>
          <div class="welcome-card-description">${i18nString(UIStrings.webDescription)}</div>
        </div>
      </div>
    `, container);
    const links = container.querySelectorAll(".welcome-link");
    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const href = link.getAttribute("href");
        if (!href) {
          return;
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: "OPEN_EXTERNAL_LINK",
            url: href
          }, "*");
        } else {
          window.open(href, "_blank", "noopener,noreferrer");
        }
      });
    });
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
