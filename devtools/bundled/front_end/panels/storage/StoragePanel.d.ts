import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type AsyncStorageStorage } from '../application/AsyncStorageStorageModel.js';
import { type MMKVStorage } from '../application/MMKVStorageModel.js';
export declare class StoragePanel extends UI.Panel.PanelWithSidebar {
    visibleView: UI.Widget.Widget | null;
    private pendingViewPromise;
    storageViews: HTMLElement;
    private readonly storageViewToolbar;
    private mmkvStorageView;
    private asyncStorageStorageView;
    private readonly sidebar;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): StoragePanel;
    focus(): void;
    resetView(): void;
    showView(view: UI.Widget.Widget | null): void;
    scheduleShowView(viewPromise: Promise<UI.Widget.Widget>): Promise<UI.Widget.Widget | null>;
    showMMKVStorage(mmkvStorage: MMKVStorage): void;
    showAsyncStorageStorage(asyncStorageStorage: AsyncStorageStorage): void;
    showCategoryView(categoryName: string, categoryHeadline: string, categoryDescription: string, _categoryLink: Platform.DevToolsPath.UrlString | null): void;
}
export declare class StoragePanelSidebar extends UI.Widget.VBox {
    private readonly panel;
    private readonly sidebarTree;
    mmkvListTreeElement: ExpandableStoragePanelTreeElement;
    asyncStorageListTreeElement: ExpandableStoragePanelTreeElement;
    private mmkvStorageTreeElements;
    private asyncStorageStorageTreeElements;
    constructor(panel: StoragePanel);
    focus(): void;
    private mmkvStorageModelAdded;
    private mmkvStorageModelRemoved;
    private mmkvStorageAdded;
    private addMMKVStorage;
    private mmkvStorageRemoved;
    private removeMMKVStorage;
    private asyncStorageStorageModelAdded;
    private asyncStorageStorageModelRemoved;
    private asyncStorageStorageAdded;
    private addAsyncStorageStorage;
    private asyncStorageStorageRemoved;
    private removeAsyncStorageStorage;
}
declare class StoragePanelTreeElement extends UI.TreeOutline.TreeElement {
    protected readonly storagePanel: StoragePanel;
    constructor(storagePanel: StoragePanel, title: string, expandable: boolean, jslogContext: string);
    deselect(): void;
    get itemURL(): Platform.DevToolsPath.UrlString;
    onselect(_selectedByUser: boolean | undefined): boolean;
    showView(view: UI.Widget.Widget | null): void;
}
declare class ExpandableStoragePanelTreeElement extends StoragePanelTreeElement {
    protected readonly expandedSetting: Common.Settings.Setting<boolean>;
    protected readonly categoryName: string;
    protected categoryLink: Platform.DevToolsPath.UrlString | null;
    protected emptyCategoryHeadline: string;
    protected categoryDescription: string;
    constructor(storagePanel: StoragePanel, categoryName: string, emptyCategoryHeadline: string, categoryDescription: string, settingsKey: string, settingsDefault?: boolean);
    get itemURL(): Platform.DevToolsPath.UrlString;
    onselect(selectedByUser?: boolean): boolean;
    onexpand(): void;
    oncollapse(): void;
    onattach(): void;
}
export {};
