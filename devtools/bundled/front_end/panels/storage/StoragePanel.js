// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import { createIcon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { AsyncStorageStorageItemsView } from '../application/AsyncStorageStorageItemsView.js';
import { AsyncStorageStorageModel } from '../application/AsyncStorageStorageModel.js';
import { MMKVStorageItemsView } from '../application/MMKVStorageItemsView.js';
import { MMKVStorageModel } from '../application/MMKVStorageModel.js';
let storagePanelInstance;
export class StoragePanel extends UI.Panel.PanelWithSidebar {
    visibleView;
    pendingViewPromise;
    storageViews;
    storageViewToolbar;
    mmkvStorageView;
    asyncStorageStorageView;
    sidebar;
    constructor() {
        super('storage');
        this.visibleView = null;
        this.pendingViewPromise = null;
        const mainContainer = new UI.Widget.VBox();
        mainContainer.setMinimumSize(100, 0);
        this.storageViews = mainContainer.element.createChild('div', 'vbox flex-auto');
        this.storageViewToolbar = mainContainer.element.createChild('devtools-toolbar', 'resources-toolbar');
        this.splitWidget().setMainWidget(mainContainer);
        this.mmkvStorageView = null;
        this.asyncStorageStorageView = null;
        this.sidebar = new StoragePanelSidebar(this);
        this.sidebar.show(this.panelSidebarElement());
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!storagePanelInstance || forceNew) {
            storagePanelInstance = new StoragePanel();
        }
        return storagePanelInstance;
    }
    focus() {
        this.sidebar.focus();
    }
    resetView() {
        if (this.visibleView) {
            this.showView(null);
        }
    }
    showView(view) {
        this.pendingViewPromise = null;
        if (this.visibleView === view) {
            return;
        }
        if (this.visibleView) {
            this.visibleView.detach();
        }
        if (view) {
            view.show(this.storageViews);
        }
        this.visibleView = view;
        this.storageViewToolbar.removeToolbarItems();
        this.storageViewToolbar.classList.toggle('hidden', true);
        if (view instanceof UI.View.SimpleView) {
            void view.toolbarItems().then(items => {
                items.map(item => this.storageViewToolbar.appendToolbarItem(item));
                this.storageViewToolbar.classList.toggle('hidden', !items.length);
            });
        }
    }
    async scheduleShowView(viewPromise) {
        this.pendingViewPromise = viewPromise;
        const view = await viewPromise;
        if (this.pendingViewPromise !== viewPromise) {
            return null;
        }
        this.showView(view);
        return view;
    }
    showMMKVStorage(mmkvStorage) {
        if (!mmkvStorage) {
            return;
        }
        if (!this.mmkvStorageView) {
            this.mmkvStorageView = new MMKVStorageItemsView(mmkvStorage);
        }
        else {
            this.mmkvStorageView.setStorage(mmkvStorage);
        }
        this.showView(this.mmkvStorageView);
    }
    showAsyncStorageStorage(asyncStorageStorage) {
        if (!asyncStorageStorage) {
            return;
        }
        if (!this.asyncStorageStorageView) {
            this.asyncStorageStorageView = new AsyncStorageStorageItemsView(asyncStorageStorage);
        }
        else {
            this.asyncStorageStorageView.setStorage(asyncStorageStorage);
        }
        this.showView(this.asyncStorageStorageView);
    }
    showCategoryView(categoryName, categoryHeadline, categoryDescription, _categoryLink) {
        // Create a simple category view / 간단한 카테고리 뷰 생성
        const categoryView = new UI.Widget.VBox();
        categoryView.element.classList.add('storage-category-view');
        const headline = categoryView.element.createChild('div', 'storage-category-headline');
        headline.textContent = categoryHeadline;
        const description = categoryView.element.createChild('div', 'storage-category-description');
        description.textContent = categoryDescription;
        this.showView(categoryView);
    }
}
// Storage Panel Sidebar / Storage 패널 사이드바
export class StoragePanelSidebar extends UI.Widget.VBox {
    panel;
    sidebarTree;
    mmkvListTreeElement;
    asyncStorageListTreeElement;
    mmkvStorageTreeElements;
    asyncStorageStorageTreeElements;
    constructor(panel) {
        super();
        this.panel = panel;
        this.element.classList.add('storage-panel-sidebar');
        this.sidebarTree = new UI.TreeOutline.TreeOutlineInShadow();
        this.sidebarTree.element.classList.add('storage-panel-sidebar-tree');
        this.sidebarTree.setFocusable(true);
        this.element.appendChild(this.sidebarTree.element);
        this.mmkvStorageTreeElements = new Map();
        this.asyncStorageStorageTreeElements = new Map();
        // Create MMKV section / MMKV 섹션 생성
        this.mmkvListTreeElement = new ExpandableStoragePanelTreeElement(this.panel, 'MMKV', 'No MMKV storage detected', 'On this page you can view, add, edit, and delete MMKV storage key-value pairs.', 'mmkv-storage');
        const mmkvIcon = createIcon('table');
        this.mmkvListTreeElement.setLeadingIcons([mmkvIcon]);
        this.sidebarTree.appendChild(this.mmkvListTreeElement);
        // Create AsyncStorage section / AsyncStorage 섹션 생성
        this.asyncStorageListTreeElement = new ExpandableStoragePanelTreeElement(this.panel, 'AsyncStorage', 'No AsyncStorage detected', 'On this page you can view, add, edit, and delete AsyncStorage key-value pairs.', 'async-storage');
        const asyncStorageIcon = createIcon('table');
        this.asyncStorageListTreeElement.setLeadingIcons([asyncStorageIcon]);
        this.sidebarTree.appendChild(this.asyncStorageListTreeElement);
        // Listen to model changes / 모델 변경 감지
        SDK.TargetManager.TargetManager.instance().observeModels(MMKVStorageModel, {
            modelAdded: (model) => this.mmkvStorageModelAdded(model),
            modelRemoved: (model) => this.mmkvStorageModelRemoved(model),
        }, { scoped: true });
        SDK.TargetManager.TargetManager.instance().observeModels(AsyncStorageStorageModel, {
            modelAdded: (model) => this.asyncStorageStorageModelAdded(model),
            modelRemoved: (model) => this.asyncStorageStorageModelRemoved(model),
        }, { scoped: true });
    }
    focus() {
        this.sidebarTree.focus();
    }
    mmkvStorageModelAdded(model) {
        model.addEventListener("MMKVStorageAdded" /* MMKVStorageModelEvents.MMKV_STORAGE_ADDED */, this.mmkvStorageAdded, this);
        model.addEventListener("MMKVStorageRemoved" /* MMKVStorageModelEvents.MMKV_STORAGE_REMOVED */, this.mmkvStorageRemoved, this);
        model.enable();
        for (const storage of model.storages()) {
            this.addMMKVStorage(storage);
        }
    }
    mmkvStorageModelRemoved(model) {
        model.removeEventListener("MMKVStorageAdded" /* MMKVStorageModelEvents.MMKV_STORAGE_ADDED */, this.mmkvStorageAdded, this);
        model.removeEventListener("MMKVStorageRemoved" /* MMKVStorageModelEvents.MMKV_STORAGE_REMOVED */, this.mmkvStorageRemoved, this);
        for (const storage of model.storages()) {
            this.removeMMKVStorage(storage);
        }
    }
    mmkvStorageAdded = (event) => {
        const mmkvStorage = event.data;
        this.addMMKVStorage(mmkvStorage);
    };
    addMMKVStorage(mmkvStorage) {
        // Check if already added / 이미 추가되었는지 확인
        if (this.mmkvStorageTreeElements.has(mmkvStorage)) {
            return;
        }
        const mmkvStorageTreeElement = new MMKVStorageTreeElement(this.panel, mmkvStorage);
        this.mmkvStorageTreeElements.set(mmkvStorage, mmkvStorageTreeElement);
        this.mmkvListTreeElement.appendChild(mmkvStorageTreeElement, comparator);
        function comparator(a, b) {
            const aTitle = a.titleAsText().toLocaleLowerCase();
            const bTitle = b.titleAsText().toLocaleLowerCase();
            return aTitle.localeCompare(bTitle);
        }
    }
    mmkvStorageRemoved = (event) => {
        const mmkvStorage = event.data;
        this.removeMMKVStorage(mmkvStorage);
    };
    removeMMKVStorage(mmkvStorage) {
        const treeElement = this.mmkvStorageTreeElements.get(mmkvStorage);
        if (!treeElement) {
            return;
        }
        const wasSelected = treeElement.selected;
        this.mmkvListTreeElement.removeChild(treeElement);
        this.mmkvStorageTreeElements.delete(mmkvStorage);
        if (wasSelected && this.mmkvListTreeElement.childCount() > 0) {
            const firstChild = this.mmkvListTreeElement.childAt(0);
            if (firstChild) {
                firstChild.select();
            }
        }
    }
    asyncStorageStorageModelAdded(model) {
        model.addEventListener("AsyncStorageStorageAdded" /* AsyncStorageStorageModelEvents.ASYNC_STORAGE_ADDED */, this.asyncStorageStorageAdded, this);
        model.addEventListener("AsyncStorageStorageRemoved" /* AsyncStorageStorageModelEvents.ASYNC_STORAGE_REMOVED */, this.asyncStorageStorageRemoved, this);
        model.enable();
        for (const storage of model.storages()) {
            this.addAsyncStorageStorage(storage);
        }
    }
    asyncStorageStorageModelRemoved(model) {
        model.removeEventListener("AsyncStorageStorageAdded" /* AsyncStorageStorageModelEvents.ASYNC_STORAGE_ADDED */, this.asyncStorageStorageAdded, this);
        model.removeEventListener("AsyncStorageStorageRemoved" /* AsyncStorageStorageModelEvents.ASYNC_STORAGE_REMOVED */, this.asyncStorageStorageRemoved, this);
        for (const storage of model.storages()) {
            this.removeAsyncStorageStorage(storage);
        }
    }
    asyncStorageStorageAdded = (event) => {
        const asyncStorageStorage = event.data;
        this.addAsyncStorageStorage(asyncStorageStorage);
    };
    addAsyncStorageStorage(asyncStorageStorage) {
        // Check if already added / 이미 추가되었는지 확인
        if (this.asyncStorageStorageTreeElements.has(asyncStorageStorage)) {
            return;
        }
        // AsyncStorage is single instance, so show directly without expandable category / AsyncStorage는 단일 인스턴스이므로 확장 가능한 카테고리 없이 직접 표시
        // If this is the first AsyncStorage, replace the expandable element with direct tree element / 첫 번째 AsyncStorage인 경우 확장 가능한 엘리먼트를 직접 트리 엘리먼트로 교체
        if (this.asyncStorageStorageTreeElements.size === 0) {
            // Remove the expandable element / 확장 가능한 엘리먼트 제거
            this.sidebarTree.removeChild(this.asyncStorageListTreeElement);
            // Create direct tree element / 직접 트리 엘리먼트 생성
            const asyncStorageStorageTreeElement = new AsyncStorageStorageTreeElement(this.panel, asyncStorageStorage);
            this.asyncStorageStorageTreeElements.set(asyncStorageStorage, asyncStorageStorageTreeElement);
            this.sidebarTree.appendChild(asyncStorageStorageTreeElement);
            // Auto-select the first AsyncStorage / 첫 번째 AsyncStorage 자동 선택
            asyncStorageStorageTreeElement.select();
        }
        else {
            // If multiple AsyncStorage instances exist, use expandable category / 여러 AsyncStorage 인스턴스가 있는 경우 확장 가능한 카테고리 사용
            const asyncStorageStorageTreeElement = new AsyncStorageStorageTreeElement(this.panel, asyncStorageStorage);
            this.asyncStorageStorageTreeElements.set(asyncStorageStorage, asyncStorageStorageTreeElement);
            this.asyncStorageListTreeElement.appendChild(asyncStorageStorageTreeElement, comparator);
            function comparator(a, b) {
                const aTitle = a.titleAsText().toLocaleLowerCase();
                const bTitle = b.titleAsText().toLocaleLowerCase();
                return aTitle.localeCompare(bTitle);
            }
        }
    }
    asyncStorageStorageRemoved = (event) => {
        const asyncStorageStorage = event.data;
        this.removeAsyncStorageStorage(asyncStorageStorage);
    };
    removeAsyncStorageStorage(asyncStorageStorage) {
        const treeElement = this.asyncStorageStorageTreeElements.get(asyncStorageStorage);
        if (!treeElement) {
            return;
        }
        const wasSelected = treeElement.selected;
        // Check if we're using direct tree element or expandable category / 직접 트리 엘리먼트를 사용하는지 확장 가능한 카테고리를 사용하는지 확인
        if (this.asyncStorageStorageTreeElements.size === 1) {
            // Last one, remove direct element and restore expandable category / 마지막 하나, 직접 엘리먼트 제거하고 확장 가능한 카테고리 복원
            this.sidebarTree.removeChild(treeElement);
            this.asyncStorageStorageTreeElements.delete(asyncStorageStorage);
            // Restore expandable element / 확장 가능한 엘리먼트 복원
            const asyncStorageIcon = createIcon('table');
            this.asyncStorageListTreeElement.setLeadingIcons([asyncStorageIcon]);
            this.sidebarTree.appendChild(this.asyncStorageListTreeElement);
        }
        else {
            // Multiple instances, remove from expandable category / 여러 인스턴스, 확장 가능한 카테고리에서 제거
            this.asyncStorageListTreeElement.removeChild(treeElement);
            this.asyncStorageStorageTreeElements.delete(asyncStorageStorage);
            if (wasSelected && this.asyncStorageListTreeElement.childCount() > 0) {
                const firstChild = this.asyncStorageListTreeElement.childAt(0);
                if (firstChild) {
                    firstChild.select();
                }
            }
        }
    }
}
// Storage Panel Tree Element / Storage 패널 트리 엘리먼트
class StoragePanelTreeElement extends UI.TreeOutline.TreeElement {
    storagePanel;
    constructor(storagePanel, title, expandable, jslogContext) {
        super(title, expandable, jslogContext);
        this.storagePanel = storagePanel;
        UI.ARIAUtils.setLabel(this.listItemElement, title);
        this.listItemElement.tabIndex = -1;
    }
    deselect() {
        super.deselect();
        this.listItemElement.tabIndex = -1;
    }
    get itemURL() {
        throw new Error('Unimplemented Method');
    }
    onselect(_selectedByUser) {
        return false;
    }
    showView(view) {
        this.storagePanel.showView(view);
    }
}
// Expandable Storage Panel Tree Element / 확장 가능한 Storage 패널 트리 엘리먼트
class ExpandableStoragePanelTreeElement extends StoragePanelTreeElement {
    expandedSetting;
    categoryName;
    categoryLink;
    emptyCategoryHeadline;
    categoryDescription;
    constructor(storagePanel, categoryName, emptyCategoryHeadline, categoryDescription, settingsKey, settingsDefault = false) {
        super(storagePanel, categoryName, false, settingsKey);
        this.expandedSetting =
            Common.Settings.Settings.instance().createSetting('storage-' + settingsKey + '-expanded', settingsDefault);
        this.categoryName = categoryName;
        this.categoryLink = null;
        this.emptyCategoryHeadline = emptyCategoryHeadline;
        this.categoryDescription = categoryDescription;
    }
    get itemURL() {
        return 'category://' + this.categoryName;
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        this.storagePanel.showCategoryView(this.categoryName, this.emptyCategoryHeadline, this.categoryDescription, this.categoryLink);
        return false;
    }
    onexpand() {
        this.expandedSetting.set(true);
    }
    oncollapse() {
        this.expandedSetting.set(false);
    }
    onattach() {
        super.onattach();
        if (this.expandedSetting.get()) {
            this.expand();
        }
    }
}
// MMKV Storage Tree Element / MMKV 스토리지 트리 엘리먼트
class MMKVStorageTreeElement extends StoragePanelTreeElement {
    mmkvStorage;
    constructor(storagePanel, mmkvStorage) {
        super(storagePanel, mmkvStorage.instanceId === 'default' ? 'MMKV (default)' : `MMKV (${mmkvStorage.instanceId})`, false, 'mmkv-storage-for-instance');
        this.mmkvStorage = mmkvStorage;
        const icon = createIcon('table');
        this.setLeadingIcons([icon]);
        this.listItemElement.setAttribute('jslog', `${VisualLogging.treeItem('mmkv-storage-instance')}`);
    }
    get itemURL() {
        return 'mmkv-storage://' + this.mmkvStorage.instanceId;
    }
    onselect(_selectedByUser) {
        super.onselect(_selectedByUser);
        this.storagePanel.showMMKVStorage(this.mmkvStorage);
        return false;
    }
    onattach() {
        super.onattach();
        this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
    }
    handleContextMenuEvent(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.defaultSection().appendItem('Clear', () => this.mmkvStorage.clear(), { jslogContext: 'clear' });
        void contextMenu.show();
    }
}
// AsyncStorage Storage Tree Element / AsyncStorage 스토리지 트리 엘리먼트
class AsyncStorageStorageTreeElement extends StoragePanelTreeElement {
    asyncStorageStorage;
    constructor(storagePanel, asyncStorageStorage) {
        super(storagePanel, 'AsyncStorage', false, 'async-storage-storage-for-instance');
        this.asyncStorageStorage = asyncStorageStorage;
        const icon = createIcon('table');
        this.setLeadingIcons([icon]);
        this.listItemElement.setAttribute('jslog', `${VisualLogging.treeItem('async-storage-storage-instance')}`);
    }
    get itemURL() {
        return 'async-storage-storage://' + this.asyncStorageStorage.instanceId;
    }
    onselect(_selectedByUser) {
        super.onselect(_selectedByUser);
        this.storagePanel.showAsyncStorageStorage(this.asyncStorageStorage);
        return false;
    }
    onattach() {
        super.onattach();
        this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
    }
    handleContextMenuEvent(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.defaultSection().appendItem('Clear', () => this.asyncStorageStorage.clear(), { jslogContext: 'clear' });
        void contextMenu.show();
    }
}
//# sourceMappingURL=StoragePanel.js.map