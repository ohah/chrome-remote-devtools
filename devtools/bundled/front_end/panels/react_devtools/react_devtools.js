var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/react_devtools/ReactDevToolsComponentsView.js
var ReactDevToolsComponentsView_exports = {};
__export(ReactDevToolsComponentsView_exports, {
  ReactDevToolsComponentsViewImpl: () => ReactDevToolsComponentsViewImpl
});
import * as i18n3 from "./../../core/i18n/i18n.js";

// gen/front_end/panels/react_devtools/ReactDevToolsViewBase.js
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Logs from "./../../models/logs/logs.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as ReactDevTools2 from "./../../third_party/react-devtools/react-devtools.js";
import * as UI from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/react_devtools/ReactDevToolsModel.js
var ReactDevToolsModel_exports = {};
__export(ReactDevToolsModel_exports, {
  ReactDevToolsModel: () => ReactDevToolsModel
});
import * as SDK from "./../../core/sdk/sdk.js";
import * as ReactNativeModels from "./../../models/react_native/react_native.js";
import * as ReactDevTools from "./../../third_party/react-devtools/react-devtools.js";
var _a;
var ReactDevToolsModel = class extends SDK.SDKModel.SDKModel {
  static FUSEBOX_BINDING_NAMESPACE = "react-devtools";
  #wall;
  #bindingsModel;
  #listeners = /* @__PURE__ */ new Set();
  #initializeCalled = false;
  #initialized = false;
  #bridge = null;
  #store = null;
  constructor(target) {
    super(target);
    this.#wall = {
      listen: (listener) => {
        this.#listeners.add(listener);
        return () => {
          this.#listeners.delete(listener);
        };
      },
      send: (event, payload) => void this.#sendMessage({ event, payload })
    };
    const bindingsModel = target.model(ReactNativeModels.ReactDevToolsBindingsModel.ReactDevToolsBindingsModel);
    if (bindingsModel === null) {
      throw new Error("Failed to construct ReactDevToolsModel: ReactDevToolsBindingsModel was null");
    }
    this.#bindingsModel = bindingsModel;
    bindingsModel.addEventListener("BackendExecutionContextCreated", this.#handleBackendExecutionContextCreated, this);
    bindingsModel.addEventListener("BackendExecutionContextUnavailable", this.#handleBackendExecutionContextUnavailable, this);
    bindingsModel.addEventListener("BackendExecutionContextDestroyed", this.#handleBackendExecutionContextDestroyed, this);
    window.addEventListener("beforeunload", this.#handleBeforeUnload);
  }
  dispose() {
    this.#bridge?.removeListener("reloadAppForProfiling", this.#handleReloadAppForProfiling);
    this.#bridge?.shutdown();
    this.#bindingsModel.removeEventListener("BackendExecutionContextCreated", this.#handleBackendExecutionContextCreated, this);
    this.#bindingsModel.removeEventListener("BackendExecutionContextUnavailable", this.#handleBackendExecutionContextUnavailable, this);
    this.#bindingsModel.removeEventListener("BackendExecutionContextDestroyed", this.#handleBackendExecutionContextDestroyed, this);
    window.removeEventListener("beforeunload", this.#handleBeforeUnload);
    this.#bridge = null;
    this.#store = null;
    this.#listeners.clear();
  }
  ensureInitialized() {
    if (this.#initializeCalled) {
      return;
    }
    this.#initializeCalled = true;
    void this.#initialize();
  }
  async #initialize() {
    try {
      const bindingsModel = this.#bindingsModel;
      await bindingsModel.enable();
      bindingsModel.subscribeToDomainMessages(_a.FUSEBOX_BINDING_NAMESPACE, (message) => this.#handleMessage(message));
      await bindingsModel.initializeDomain(_a.FUSEBOX_BINDING_NAMESPACE);
      this.#initialized = true;
      this.#finishInitializationAndNotify();
    } catch (e) {
      this.dispatchEventToListeners("InitializationFailed", e instanceof Error ? e.message : String(e));
    }
  }
  isInitialized() {
    return this.#initialized;
  }
  getBridgeOrThrow() {
    if (this.#bridge === null) {
      throw new Error("Failed to get bridge from ReactDevToolsModel: bridge was null");
    }
    return this.#bridge;
  }
  getStoreOrThrow() {
    if (this.#store === null) {
      throw new Error("Failed to get store from ReactDevToolsModel: store was null");
    }
    return this.#store;
  }
  #handleMessage(message) {
    if (!message) {
      return;
    }
    for (const listener of this.#listeners) {
      listener(message);
    }
  }
  async #sendMessage(message) {
    const rdtBindingsModel = this.#bindingsModel;
    if (!rdtBindingsModel) {
      throw new Error("Failed to send message from ReactDevToolsModel: ReactDevToolsBindingsModel was null");
    }
    return await rdtBindingsModel.sendMessage(_a.FUSEBOX_BINDING_NAMESPACE, message);
  }
  #handleBeforeUnload = () => {
    this.#bridge?.shutdown();
  };
  #handleBackendExecutionContextCreated() {
    const rdtBindingsModel = this.#bindingsModel;
    if (!rdtBindingsModel) {
      throw new Error("ReactDevToolsModel failed to handle BackendExecutionContextCreated event: ReactDevToolsBindingsModel was null");
    }
    if (!rdtBindingsModel.isEnabled()) {
      this.ensureInitialized();
    } else {
      this.#finishInitializationAndNotify();
    }
  }
  #finishInitializationAndNotify() {
    this.#bridge = ReactDevTools.createBridge(this.#wall);
    this.#store = ReactDevTools.createStore(this.#bridge, {
      supportsReloadAndProfile: true
    });
    this.#bridge.addListener("reloadAppForProfiling", this.#handleReloadAppForProfiling);
    this.dispatchEventToListeners(
      "InitializationCompleted"
      /* Events.INITIALIZATION_COMPLETED */
    );
  }
  #handleReloadAppForProfiling() {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    void mainTarget?.pageAgent().invoke_reload({ ignoreCache: true });
  }
  #handleBackendExecutionContextUnavailable({ data: errorMessage }) {
    this.dispatchEventToListeners("InitializationFailed", errorMessage);
  }
  #handleBackendExecutionContextDestroyed() {
    this.#bridge?.shutdown();
    this.#bridge = null;
    this.#store = null;
    this.#listeners.clear();
    this.dispatchEventToListeners(
      "Destroyed"
      /* Events.DESTROYED */
    );
  }
};
_a = ReactDevToolsModel;
SDK.SDKModel.SDKModel.register(ReactDevToolsModel, { capabilities: 4, autostart: false });

// gen/front_end/panels/react_devtools/ReactDevToolsViewBase.js
var UIStrings = {
  /**
   * @description Label of the FB-only 'send feedback' button.
   */
  sendFeedback: "[FB-only] Send feedback"
};
var str_ = i18n.i18n.registerUIStrings("panels/react_devtools/ReactDevToolsViewBase.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
async function openResource(url, lineNumber, columnNumber) {
  const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
  if (uiSourceCode) {
    const normalizedUiLocation = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().normalizeUILocation(uiSourceCode.uiLocation(lineNumber, columnNumber));
    void Common.Revealer.reveal(normalizedUiLocation);
    return;
  }
  const resource = Bindings.ResourceUtils.resourceForURL(url);
  if (resource) {
    void Common.Revealer.reveal(resource);
    return;
  }
  const request = Logs.NetworkLog.NetworkLog.instance().requestForURL(url);
  if (request) {
    void Common.Revealer.reveal(request);
    return;
  }
  throw new Error("Could not find resource for " + url);
}
function viewElementSourceFunction(source, symbolicatedSource) {
  const { sourceURL, line, column } = symbolicatedSource ? symbolicatedSource : source;
  void openResource(sourceURL, line - 1, column - 1);
}
var ReactDevToolsViewBase = class extends UI.View.SimpleView {
  #tab;
  #model = null;
  constructor(tab, title) {
    super({ title, viewId: `react-devtools-${tab}` });
    this.registerRequiredCSS(ReactDevTools2.CSS);
    this.#tab = tab;
    this.#renderLoader();
    SDK2.TargetManager.TargetManager.instance().observeModels(ReactDevToolsModel, this);
    this.element.style.userSelect = "text";
  }
  modelAdded(model) {
    this.#model = model;
    model.addEventListener("InitializationCompleted", this.#handleInitializationCompleted, this);
    model.addEventListener("InitializationFailed", this.#handleInitializationFailed, this);
    model.addEventListener("Destroyed", this.#handleBackendDestroyed, this);
    if (model.isInitialized()) {
      this.#renderDevToolsView();
    } else {
      model.ensureInitialized();
    }
  }
  modelRemoved(model) {
    model.removeEventListener("InitializationCompleted", this.#handleInitializationCompleted, this);
    model.removeEventListener("InitializationFailed", this.#handleInitializationFailed, this);
    model.removeEventListener("Destroyed", this.#handleBackendDestroyed, this);
  }
  #handleInitializationCompleted() {
    this.#renderDevToolsView();
  }
  #handleInitializationFailed({ data: errorMessage }) {
    this.#renderErrorView(errorMessage);
  }
  #handleBackendDestroyed() {
    this.#renderLoader();
  }
  #renderDevToolsView() {
    this.#clearView();
    const model = this.#model;
    if (model === null) {
      throw new Error("Attempted to render React DevTools panel, but the model was null");
    }
    const usingDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initializeFn = this.#tab === "components" ? ReactDevTools2.initializeComponents : ReactDevTools2.initializeProfiler;
    initializeFn(this.contentElement, {
      bridge: model.getBridgeOrThrow(),
      store: model.getStoreOrThrow(),
      theme: usingDarkTheme ? "dark" : "light",
      canViewElementSourceFunction: () => true,
      viewElementSourceFunction
    });
  }
  #renderLoader() {
    this.#clearView();
    const loaderContainer = document.createElement("div");
    loaderContainer.setAttribute("style", "display: flex; flex: 1; justify-content: center; align-items: center");
    const loader = document.createElement("span");
    loader.classList.add("spinner");
    loaderContainer.appendChild(loader);
    this.contentElement.appendChild(loaderContainer);
  }
  #renderErrorView(errorMessage) {
    this.#clearView();
    const errorContainer = document.createElement("div");
    errorContainer.setAttribute("style", "display: flex; flex: 1; flex-direction: column; justify-content: center; align-items: center");
    const errorIconView = document.createElement("div");
    errorIconView.setAttribute("style", "font-size: 3rem");
    errorIconView.innerHTML = "\u2757";
    const errorMessageParagraph = document.createElement("p");
    errorMessageParagraph.setAttribute("style", "user-select: all");
    errorMessageParagraph.innerHTML = errorMessage;
    errorContainer.appendChild(errorIconView);
    errorContainer.appendChild(errorMessageParagraph);
    this.contentElement.appendChild(errorContainer);
    const feedbackLink = globalThis.FB_ONLY__reactNativeFeedbackLink;
    if (feedbackLink) {
      const feedbackButton = UI.UIUtils.createTextButton(i18nString(UIStrings.sendFeedback), () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(feedbackLink);
      }, { className: "primary-button", jslogContext: "sendFeedback" });
      errorContainer.appendChild(feedbackButton);
    }
  }
  #clearView() {
    this.contentElement.removeChildren();
  }
};

// gen/front_end/panels/react_devtools/ReactDevToolsComponentsView.js
var UIStrings2 = {
  /**
   *@description Title of the React DevTools view
   */
  title: "\u269B\uFE0F Components (React DevTools)"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/react_devtools/ReactDevToolsComponentsView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var ReactDevToolsComponentsViewImpl = class extends ReactDevToolsViewBase {
  constructor() {
    super("components", i18nString2(UIStrings2.title));
  }
};

// gen/front_end/panels/react_devtools/ReactDevToolsProfilerView.js
var ReactDevToolsProfilerView_exports = {};
__export(ReactDevToolsProfilerView_exports, {
  ReactDevToolsProfilerViewImpl: () => ReactDevToolsProfilerViewImpl
});
import * as i18n5 from "./../../core/i18n/i18n.js";
var UIStrings3 = {
  /**
   *@description Title of the React DevTools view
   */
  title: "\u269B\uFE0F Profiler (React DevTools)"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/react_devtools/ReactDevToolsProfilerView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var ReactDevToolsProfilerViewImpl = class extends ReactDevToolsViewBase {
  constructor() {
    super("profiler", i18nString3(UIStrings3.title));
  }
};
export {
  ReactDevToolsComponentsView_exports as ReactDevToolsComponentsView,
  ReactDevToolsModel_exports as ReactDevToolsModel,
  ReactDevToolsProfilerView_exports as ReactDevToolsProfilerView
};
//# sourceMappingURL=react_devtools.js.map
