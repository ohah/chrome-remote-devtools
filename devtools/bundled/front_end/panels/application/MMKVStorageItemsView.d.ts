import * as UI from '../../ui/legacy/legacy.js';
import { MMKVStorage } from './MMKVStorageModel.js';
import { KeyValueStorageItemsView } from './KeyValueStorageItemsView.js';
export declare class MMKVStorageItemsView extends KeyValueStorageItemsView {
    #private;
    private mmkvStorage;
    private eventListeners;
    get storage(): MMKVStorage;
    constructor(mmkvStorage: MMKVStorage);
    protected createPreview(key: string, value: string): Promise<UI.Widget.Widget | null>;
    setStorage(mmkvStorage: MMKVStorage): void;
    private mmkvStorageItemsCleared;
    itemsCleared(): void;
    private mmkvStorageItemRemoved;
    itemRemoved(key: string): void;
    private mmkvStorageItemAdded;
    private mmkvStorageItemUpdated;
    refreshItems(): void;
    deleteAllItems(): void;
    protected removeItem(key: string): void;
    protected setItem(key: string, value: string): void;
}
