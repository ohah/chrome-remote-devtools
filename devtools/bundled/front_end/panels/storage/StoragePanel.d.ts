import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type AsyncStorageStorage } from '../application/AsyncStorageStorageModel.js';
/** Panel interface for AsyncStorage sidebar / AsyncStorage 사이드바용 패널 인터페이스 */
export interface IAsyncStorageStoragePanel {
    showView(view: UI.Widget.Widget | null): void;
    showAsyncStorageStorage(asyncStorageStorage: AsyncStorageStorage): void;
}
export declare class StoragePanel extends UI.Panel.PanelWithSidebar implements IAsyncStorageStoragePanel {
    visibleView: UI.Widget.Widget | null;
    private pendingViewPromise;
    storageViews: HTMLElement;
    private readonly storageViewToolbar;
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
    showAsyncStorageStorage(asyncStorageStorage: AsyncStorageStorage): void;
    showCategoryView(categoryName: string, categoryHeadline: string, categoryDescription: string, _categoryLink: Platform.DevToolsPath.UrlString | null): void;
}
/** AsyncStorage-only panel / AsyncStorage 전용 패널 */
export declare class AsyncStorageStoragePanel extends UI.Panel.PanelWithSidebar implements IAsyncStorageStoragePanel {
    visibleView: UI.Widget.Widget | null;
    private pendingViewPromise;
    storageViews: HTMLElement;
    private readonly storageViewToolbar;
    private asyncStorageStorageView;
    private readonly sidebar;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): AsyncStorageStoragePanel;
    focus(): void;
    showView(view: UI.Widget.Widget | null): void;
    showAsyncStorageStorage(asyncStorageStorage: AsyncStorageStorage): void;
    showCategoryView(_categoryName: string, categoryHeadline: string, categoryDescription: string, _categoryLink: Platform.DevToolsPath.UrlString | null): void;
}
export declare class StoragePanelSidebar extends UI.Widget.VBox {
    private readonly panel;
    private readonly sidebarTree;
    asyncStorageListTreeElement: ExpandableStoragePanelTreeElement;
    private asyncStorageStorageTreeElements;
    constructor(panel: StoragePanel);
    focus(): void;
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
