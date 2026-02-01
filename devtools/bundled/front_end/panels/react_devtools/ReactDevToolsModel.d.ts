import * as SDK from '../../core/sdk/sdk.js';
import type * as ReactDevToolsTypes from '../../third_party/react-devtools/react-devtools.js';
export declare const enum Events {
    INITIALIZATION_COMPLETED = "InitializationCompleted",
    INITIALIZATION_FAILED = "InitializationFailed",
    DESTROYED = "Destroyed"
}
export interface EventTypes {
    [Events.INITIALIZATION_COMPLETED]: void;
    [Events.INITIALIZATION_FAILED]: string;
    [Events.DESTROYED]: void;
}
export declare class ReactDevToolsModel extends SDK.SDKModel.SDKModel<EventTypes> {
    #private;
    private static readonly FUSEBOX_BINDING_NAMESPACE;
    constructor(target: SDK.Target.Target);
    dispose(): void;
    ensureInitialized(): void;
    isInitialized(): boolean;
    getBridgeOrThrow(): ReactDevToolsTypes.Bridge;
    getStoreOrThrow(): ReactDevToolsTypes.Store;
}
