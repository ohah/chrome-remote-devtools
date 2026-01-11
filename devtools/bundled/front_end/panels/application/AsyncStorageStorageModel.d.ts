import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
export declare class AsyncStorageStorage extends Common.ObjectWrapper.ObjectWrapper<AsyncStorageStorage.EventTypes> {
    #private;
    private readonly model;
    constructor(model: AsyncStorageStorageModel, instanceId: string);
    get instanceId(): string;
    getItems(): Promise<Protocol.AsyncStorageStorage.Item[] | null>;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}
export declare namespace AsyncStorageStorage {
    const enum Events {
        ASYNC_STORAGE_ITEMS_CLEARED = "AsyncStorageItemsCleared",
        ASYNC_STORAGE_ITEM_REMOVED = "AsyncStorageItemRemoved",
        ASYNC_STORAGE_ITEM_ADDED = "AsyncStorageItemAdded",
        ASYNC_STORAGE_ITEM_UPDATED = "AsyncStorageItemUpdated"
    }
    interface AsyncStorageItemRemovedEvent {
        key: string;
    }
    interface AsyncStorageItemAddedEvent {
        key: string;
        value: string;
    }
    interface AsyncStorageItemUpdatedEvent {
        key: string;
        oldValue: string;
        value: string;
    }
    interface EventTypes {
        [Events.ASYNC_STORAGE_ITEMS_CLEARED]: void;
        [Events.ASYNC_STORAGE_ITEM_REMOVED]: AsyncStorageItemRemovedEvent;
        [Events.ASYNC_STORAGE_ITEM_ADDED]: AsyncStorageItemAddedEvent;
        [Events.ASYNC_STORAGE_ITEM_UPDATED]: AsyncStorageItemUpdatedEvent;
    }
}
export declare class AsyncStorageStorageModel extends SDK.SDKModel.SDKModel<EventTypes> {
    #private;
    readonly agent: ProtocolProxyApi.AsyncStorageStorageApi;
    private enabled?;
    constructor(target: SDK.Target.Target);
    enable(): void;
    asyncStorageItemsCleared({ instanceId }: Protocol.AsyncStorageStorage.AsyncStorageItemsClearedEvent): void;
    asyncStorageItemRemoved({ instanceId, key }: Protocol.AsyncStorageStorage.AsyncStorageItemRemovedEvent): void;
    asyncStorageItemAdded({ instanceId, key, newValue }: Protocol.AsyncStorageStorage.AsyncStorageItemAddedEvent): void;
    asyncStorageItemUpdated({ instanceId, key, oldValue, newValue }: Protocol.AsyncStorageStorage.AsyncStorageItemUpdatedEvent): void;
    asyncStorageInstanceCreated({ instanceId }: Protocol.AsyncStorageStorage.AsyncStorageInstanceCreatedEvent): void;
    private addStorage;
    private storageForInstanceId;
    storages(): AsyncStorageStorage[];
}
export declare const enum Events {
    ASYNC_STORAGE_ADDED = "AsyncStorageStorageAdded",
    ASYNC_STORAGE_REMOVED = "AsyncStorageStorageRemoved"
}
export interface EventTypes {
    [Events.ASYNC_STORAGE_ADDED]: AsyncStorageStorage;
    [Events.ASYNC_STORAGE_REMOVED]: AsyncStorageStorage;
}
export declare class AsyncStorageStorageDispatcher implements ProtocolProxyApi.AsyncStorageStorageDispatcher {
    private readonly model;
    constructor(model: AsyncStorageStorageModel);
    asyncStorageItemsCleared({ instanceId }: Protocol.AsyncStorageStorage.AsyncStorageItemsClearedEvent): void;
    asyncStorageItemRemoved({ instanceId, key }: Protocol.AsyncStorageStorage.AsyncStorageItemRemovedEvent): void;
    asyncStorageItemAdded({ instanceId, key, newValue }: Protocol.AsyncStorageStorage.AsyncStorageItemAddedEvent): void;
    asyncStorageItemUpdated({ instanceId, key, oldValue, newValue }: Protocol.AsyncStorageStorage.AsyncStorageItemUpdatedEvent): void;
    asyncStorageInstanceCreated({ instanceId }: Protocol.AsyncStorageStorage.AsyncStorageInstanceCreatedEvent): void;
}
