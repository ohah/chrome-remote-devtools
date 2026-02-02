import * as UI from '../../ui/legacy/legacy.js';
import { StorageItemsToolbar } from './StorageItemsToolbar.js';
import { MMKVStorage } from './MMKVStorageModel.js';
type Widget = UI.Widget.Widget;
/** Narrow literal union for MMKV value type / MMKV 값 타입 리터럴 유니온 */
declare const MMKV_VALUE_TYPES: readonly ["string", "number", "boolean", "buffer"];
type ValueType = (typeof MMKV_VALUE_TYPES)[number];
export interface MMKVItem {
    key: string;
    value: string;
    valueType: ValueType;
}
/**
 * Validate value string for given MMKV type / MMKV 타입에 맞는 값 문자열 검증
 * @returns valid and optional error message
 */
export declare function validateValueForType(value: string, valueType: ValueType): {
    valid: boolean;
    message?: string;
};
/**
 * MMKV Storage Items View with Key, Value, Type columns and type-aware editing.
 * Uses Lit for the UI; does not reuse KeyValueStorageItemsView (Local Storage style) because MMKV has typed values.
 */
export declare class MMKVStorageItemsView extends UI.Widget.VBox {
    #private;
    constructor(mmkvStorage: MMKVStorage);
    get storage(): MMKVStorage;
    setStorage(mmkvStorage: MMKVStorage): void;
    wasShown(): void;
    refreshItems(): void;
    deleteAllItems(): void;
    deleteSelectedItem(): void;
    private showPreview;
    protected createPreview(key: string, value: string): Promise<Widget | null>;
    performUpdate(): void;
    protected get toolbar(): StorageItemsToolbar | undefined;
}
export {};
