var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/react_native/ReactDevToolsBindingsModel.js
var ReactDevToolsBindingsModel_exports = {};
__export(ReactDevToolsBindingsModel_exports, {
  ReactDevToolsBindingsModel: () => ReactDevToolsBindingsModel
});
import * as SDK from "./../../core/sdk/sdk.js";
var MAIN_EXECUTION_CONTEXT_NAME = "main";
var RUNTIME_GLOBAL = "__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__";
var ReactDevToolsBindingsModel = class extends SDK.SDKModel.SDKModel {
  domainToListeners = /* @__PURE__ */ new Map();
  messagingBindingName = null;
  enabled = false;
  fuseboxDispatcherIsInitialized = false;
  domainToMessageQueue = /* @__PURE__ */ new Map();
  dispose() {
    this.domainToListeners.clear();
    this.domainToMessageQueue.clear();
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    runtimeModel?.removeEventListener(SDK.RuntimeModel.Events.BindingCalled, this.bindingCalled, this);
    runtimeModel?.removeEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, this.onExecutionContextCreated, this);
    runtimeModel?.removeEventListener(SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.onExecutionContextDestroyed, this);
  }
  bindingCalled(event) {
    if (this.messagingBindingName === null || event.data.name !== this.messagingBindingName) {
      return;
    }
    const serializedMessage = event.data.payload;
    let parsedMessage = null;
    try {
      parsedMessage = JSON.parse(serializedMessage);
    } catch (err) {
      throw new Error("Failed to parse bindingCalled event payload", { cause: err });
    }
    if (parsedMessage) {
      const domainName = parsedMessage.domain;
      if (this.fuseboxDispatcherIsInitialized) {
        if (!this.isDomainMessagesQueueEmpty(domainName)) {
          throw new Error(`Attempted to send a message to domain ${domainName} while queue is not empty`);
        }
        this.dispatchMessageToDomainEventListeners(domainName, parsedMessage.message);
      } else {
        this.queueMessageForDomain(domainName, parsedMessage.message);
      }
    }
  }
  queueMessageForDomain(domainName, message) {
    let queue = this.domainToMessageQueue.get(domainName);
    if (!queue) {
      queue = [];
      this.domainToMessageQueue.set(domainName, queue);
    }
    queue.push(message);
  }
  flushOutDomainMessagesQueues() {
    for (const [domainName, queue] of this.domainToMessageQueue.entries()) {
      if (queue.length === 0) {
        continue;
      }
      for (const message of queue) {
        this.dispatchMessageToDomainEventListeners(domainName, message);
      }
      queue.splice(0, queue.length);
    }
  }
  isDomainMessagesQueueEmpty(domainName) {
    const queue = this.domainToMessageQueue.get(domainName);
    return queue === void 0 || queue.length === 0;
  }
  subscribeToDomainMessages(domainName, listener) {
    let listeners = this.domainToListeners.get(domainName);
    if (!listeners) {
      listeners = /* @__PURE__ */ new Set();
      this.domainToListeners.set(domainName, listeners);
    }
    listeners.add(listener);
  }
  unsubscribeFromDomainMessages(domainName, listener) {
    const listeners = this.domainToListeners.get(domainName);
    if (!listeners) {
      return;
    }
    listeners.delete(listener);
  }
  dispatchMessageToDomainEventListeners(domainName, message) {
    const listeners = this.domainToListeners.get(domainName);
    if (!listeners) {
      return;
    }
    const errors = [];
    for (const listener of listeners) {
      try {
        listener(message);
      } catch (e) {
        errors.push(e);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, `Error occurred in ReactDevToolsBindingsModel while calling event listeners for domain ${domainName}`);
    }
  }
  async initializeDomain(domainName) {
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error(`Failed to initialize domain ${domainName} for ReactDevToolsBindingsModel: runtime model is not available`);
    }
    await runtimeModel.agent.invoke_evaluate({ expression: `void ${RUNTIME_GLOBAL}.initializeDomain('${domainName}')` });
  }
  async sendMessage(domainName, message) {
    if (!this.fuseboxDispatcherIsInitialized) {
      return;
    }
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error(`Failed to send message from ReactDevToolsBindingsModel for domain ${domainName}: runtime model is not available`);
    }
    const serializedMessage = JSON.stringify(message);
    await runtimeModel.agent.invoke_evaluate({ expression: `${RUNTIME_GLOBAL}.sendMessage('${domainName}', '${serializedMessage}')` });
  }
  async enable() {
    if (this.enabled) {
      throw new Error("ReactDevToolsBindingsModel is already enabled");
    }
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error("Failed to enable ReactDevToolsBindingsModel: runtime model is not available");
    }
    await this.waitForFuseboxDispatcherToBeInitialized().then(() => runtimeModel.agent.invoke_evaluate({ expression: `${RUNTIME_GLOBAL}.BINDING_NAME` })).then((response) => {
      if (response.exceptionDetails) {
        throw new Error("Failed to get binding name for ReactDevToolsBindingsModel on a global: " + response.exceptionDetails.text);
      }
      if (response.result.value === null || response.result.value === void 0) {
        throw new Error("Failed to get binding name for ReactDevToolsBindingsModel on a global: returned value is " + String(response.result.value));
      }
      if (response.result.value === "") {
        throw new Error("Failed to get binding name for ReactDevToolsBindingsModel on a global: returned value is an empty string");
      }
      return response.result.value;
    }).then((bindingName) => {
      this.messagingBindingName = bindingName;
      runtimeModel.addEventListener(SDK.RuntimeModel.Events.BindingCalled, this.bindingCalled, this);
      return runtimeModel.agent.invoke_addBinding({ name: bindingName });
    }).then((response) => {
      const possiblyError = response.getError();
      if (possiblyError) {
        throw new Error("Failed to add binding for ReactDevToolsBindingsModel: " + possiblyError);
      }
      this.enabled = true;
      this.initializeExecutionContextListeners();
    });
  }
  isEnabled() {
    return this.enabled;
  }
  initializeExecutionContextListeners() {
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error("Failed to initialize execution context listeners for ReactDevToolsBindingsModel: runtime model is not available");
    }
    runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, this.onExecutionContextCreated, this);
    runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.onExecutionContextDestroyed, this);
  }
  onExecutionContextCreated({ data: executionContext }) {
    if (executionContext.name !== MAIN_EXECUTION_CONTEXT_NAME) {
      return;
    }
    void this.waitForFuseboxDispatcherToBeInitialized().then(() => {
      this.dispatchEventToListeners(
        "BackendExecutionContextCreated"
        /* Events.BACKEND_EXECUTION_CONTEXT_CREATED */
      );
      this.flushOutDomainMessagesQueues();
    }).catch((error) => this.dispatchEventToListeners("BackendExecutionContextUnavailable", error.message));
  }
  onExecutionContextDestroyed({ data: executionContext }) {
    if (executionContext.name !== MAIN_EXECUTION_CONTEXT_NAME) {
      return;
    }
    this.fuseboxDispatcherIsInitialized = false;
    this.dispatchEventToListeners(
      "BackendExecutionContextDestroyed"
      /* Events.BACKEND_EXECUTION_CONTEXT_DESTROYED */
    );
  }
  async waitForFuseboxDispatcherToBeInitialized(attempt = 1) {
    if (attempt >= 20) {
      throw new Error("Failed to wait for initialization: it took too long");
    }
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error("Failed to wait for React DevTools dispatcher initialization: runtime model is not available");
    }
    await runtimeModel.agent.invoke_evaluate({
      expression: `globalThis.${RUNTIME_GLOBAL} != undefined`,
      returnByValue: true
    }).then((response) => {
      if (response.exceptionDetails) {
        throw new Error("Failed to wait for React DevTools dispatcher initialization: " + response.exceptionDetails.text);
      }
      if (response.result.value === false) {
        return new Promise((resolve) => setTimeout(resolve, 250)).then(() => this.waitForFuseboxDispatcherToBeInitialized(attempt + 1));
      }
      this.fuseboxDispatcherIsInitialized = true;
      return;
    });
  }
};
SDK.SDKModel.SDKModel.register(ReactDevToolsBindingsModel, { capabilities: 4, autostart: false });
export {
  ReactDevToolsBindingsModel_exports as ReactDevToolsBindingsModel
};
//# sourceMappingURL=react_native.js.map
