import * as SDK from '../../core/sdk/sdk.js';
type JSONValue = null | string | number | boolean | {
    [key: string]: JSONValue;
} | JSONValue[];
type DomainName = 'react-devtools';
type DomainMessageListener = (message: JSONValue) => void;
export declare const enum Events {
    BACKEND_EXECUTION_CONTEXT_CREATED = "BackendExecutionContextCreated",
    BACKEND_EXECUTION_CONTEXT_UNAVAILABLE = "BackendExecutionContextUnavailable",
    BACKEND_EXECUTION_CONTEXT_DESTROYED = "BackendExecutionContextDestroyed"
}
export interface EventTypes {
    [Events.BACKEND_EXECUTION_CONTEXT_CREATED]: void;
    [Events.BACKEND_EXECUTION_CONTEXT_UNAVAILABLE]: string;
    [Events.BACKEND_EXECUTION_CONTEXT_DESTROYED]: void;
}
export declare class ReactDevToolsBindingsModel extends SDK.SDKModel.SDKModel {
    private readonly domainToListeners;
    private messagingBindingName;
    private enabled;
    private fuseboxDispatcherIsInitialized;
    private readonly domainToMessageQueue;
    dispose(): void;
    private bindingCalled;
    private queueMessageForDomain;
    private flushOutDomainMessagesQueues;
    private isDomainMessagesQueueEmpty;
    subscribeToDomainMessages(domainName: DomainName, listener: DomainMessageListener): void;
    unsubscribeFromDomainMessages(domainName: DomainName, listener: DomainMessageListener): void;
    private dispatchMessageToDomainEventListeners;
    initializeDomain(domainName: DomainName): Promise<void>;
    sendMessage(domainName: DomainName, message: JSONValue): Promise<void>;
    enable(): Promise<void>;
    isEnabled(): boolean;
    private initializeExecutionContextListeners;
    private onExecutionContextCreated;
    private onExecutionContextDestroyed;
    private waitForFuseboxDispatcherToBeInitialized;
}
export {};
