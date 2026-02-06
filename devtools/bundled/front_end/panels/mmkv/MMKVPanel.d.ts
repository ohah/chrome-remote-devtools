import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type MMKVStorage } from './MMKVStorageModel.js';
/** Panel interface for MMKV sidebar / MMKV 사이드바용 패널 인터페이스 */
export interface MMKVPanelContract {
    showView(view: UI.Widget.Widget | null): void;
    showMMKVStorage(mmkvStorage: MMKVStorage): void;
}
export declare class MMKVPanel extends UI.Panel.PanelWithSidebar implements MMKVPanelContract {
    visibleView: UI.Widget.Widget | null;
    private pendingViewPromise;
    storageViews: HTMLElement;
    private readonly storageViewToolbar;
    private mmkvStorageView;
    private readonly sidebar;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): MMKVPanel;
    focus(): void;
    showView(view: UI.Widget.Widget | null): void;
    showMMKVStorage(mmkvStorage: MMKVStorage): void;
    showCategoryView(_categoryName: string, categoryHeadline: string, categoryDescription: string, _categoryLink: Platform.DevToolsPath.UrlString | null): void;
}
