import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
export declare class MMKVStorage extends Common.ObjectWrapper.ObjectWrapper<MMKVStorage.EventTypes> {
    #private;
    private readonly model;
    constructor(model: MMKVStorageModel, instanceId: string);
    get instanceId(): string;
    getItems(): Promise<Protocol.MMKVStorage.Item[] | null>;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}
export declare namespace MMKVStorage {
    const enum Events {
        MMKV_ITEMS_CLEARED = "MMKVItemsCleared",
        MMKV_ITEM_REMOVED = "MMKVItemRemoved",
        MMKV_ITEM_ADDED = "MMKVItemAdded",
        MMKV_ITEM_UPDATED = "MMKVItemUpdated"
    }
    interface MmkvItemRemovedEvent {
        key: string;
    }
    interface MmkvItemAddedEvent {
        key: string;
        value: string;
    }
    interface MmkvItemUpdatedEvent {
        key: string;
        oldValue: string;
        value: string;
    }
    interface EventTypes {
        [Events.MMKV_ITEMS_CLEARED]: void;
        [Events.MMKV_ITEM_REMOVED]: MmkvItemRemovedEvent;
        [Events.MMKV_ITEM_ADDED]: MmkvItemAddedEvent;
        [Events.MMKV_ITEM_UPDATED]: MmkvItemUpdatedEvent;
    }
}
export declare class MMKVStorageModel extends SDK.SDKModel.SDKModel<EventTypes> {
    #private;
    readonly agent: ProtocolProxyApi.MMKVStorageApi;
    private enabled?;
    constructor(target: SDK.Target.Target);
    enable(): void;
    mmkvItemsCleared({ instanceId }: Protocol.MMKVStorage.MmkvItemsClearedEvent): void;
    mmkvItemRemoved({ instanceId, key }: Protocol.MMKVStorage.MmkvItemRemovedEvent): void;
    mmkvItemAdded({ instanceId, key, newValue }: Protocol.MMKVStorage.MmkvItemAddedEvent): void;
    mmkvItemUpdated({ instanceId, key, oldValue, newValue }: Protocol.MMKVStorage.MmkvItemUpdatedEvent): void;
    mmkvInstanceCreated({ instanceId }: Protocol.MMKVStorage.MmkvInstanceCreatedEvent): void;
    private addStorage;
    private storageForInstanceId;
    storages(): MMKVStorage[];
}
export declare const enum Events {
    MMKV_STORAGE_ADDED = "MMKVStorageAdded",
    MMKV_STORAGE_REMOVED = "MMKVStorageRemoved"
}
export interface EventTypes {
    [Events.MMKV_STORAGE_ADDED]: MMKVStorage;
    [Events.MMKV_STORAGE_REMOVED]: MMKVStorage;
}
export declare class MMKVStorageDispatcher implements ProtocolProxyApi.MMKVStorageDispatcher {
    private readonly model;
    constructor(model: MMKVStorageModel);
    mmkvItemsCleared({ instanceId }: Protocol.MMKVStorage.MmkvItemsClearedEvent): void;
    mmkvItemRemoved({ instanceId, key }: Protocol.MMKVStorage.MmkvItemRemovedEvent): void;
    mmkvItemAdded({ instanceId, key, newValue }: Protocol.MMKVStorage.MmkvItemAddedEvent): void;
    mmkvItemUpdated({ instanceId, key, oldValue, newValue }: Protocol.MMKVStorage.MmkvItemUpdatedEvent): void;
    mmkvInstanceCreated({ instanceId }: Protocol.MMKVStorage.MmkvInstanceCreatedEvent): void;
}
