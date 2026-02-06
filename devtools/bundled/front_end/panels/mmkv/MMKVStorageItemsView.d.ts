import * as UI from '../../ui/legacy/legacy.js';
import { StorageItemsToolbar } from '../application/StorageItemsToolbar.js';
import { MMKVStorage } from './MMKVStorageModel.js';
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
 */
export declare function validateValueForType(value: string, valueType: ValueType): {
    valid: boolean;
    message?: string;
};
export declare class MMKVStorageItemsView extends UI.Widget.VBox {
    #private;
    constructor(mmkvStorage: MMKVStorage);
    get storage(): MMKVStorage;
    setStorage(mmkvStorage: MMKVStorage): void;
    wasShown(): void;
    refreshItems(): void;
    deleteAllItems(): void;
    deleteSelectedItem(): void;
    performUpdate(): void;
    protected get toolbar(): StorageItemsToolbar | undefined;
}
export {};
