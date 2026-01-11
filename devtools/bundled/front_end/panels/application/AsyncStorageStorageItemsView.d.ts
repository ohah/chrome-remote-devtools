import * as UI from '../../ui/legacy/legacy.js';
import { KeyValueStorageItemsView } from './KeyValueStorageItemsView.js';
import { AsyncStorageStorage } from './AsyncStorageStorageModel.js';
export declare class AsyncStorageStorageItemsView extends KeyValueStorageItemsView {
    #private;
    private asyncStorageStorage;
    private eventListeners;
    get storage(): AsyncStorageStorage;
    constructor(asyncStorageStorage: AsyncStorageStorage);
    protected createPreview(key: string, value: string): Promise<UI.Widget.Widget | null>;
    setStorage(asyncStorageStorage: AsyncStorageStorage): void;
    private asyncStorageStorageItemsCleared;
    itemsCleared(): void;
    private asyncStorageStorageItemRemoved;
    itemRemoved(key: string): void;
    private asyncStorageStorageItemAdded;
    private asyncStorageStorageItemUpdated;
    refreshItems(): void;
    deleteAllItems(): void;
    protected removeItem(key: string): void;
    protected setItem(key: string, value: string): void;
}
