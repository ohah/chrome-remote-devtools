// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as SDK from '../../core/sdk/sdk.js';
import { createIcon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { MMKVStorageModel } from './MMKVStorageModel.js';
import { MMKVStorageItemsView } from './MMKVStorageItemsView.js';
let mmkvPanelInstance = null;
export class MMKVPanel extends UI.Panel.PanelWithSidebar {
    visibleView;
    pendingViewPromise;
    storageViews;
    storageViewToolbar;
    mmkvStorageView;
    sidebar;
    constructor() {
        super('mmkv');
        this.visibleView = null;
        this.pendingViewPromise = null;
        const mainContainer = new UI.Widget.VBox();
        mainContainer.setMinimumSize(100, 0);
        this.storageViews = mainContainer.element.createChild('div', 'vbox flex-auto');
        this.storageViewToolbar = mainContainer.element.createChild('devtools-toolbar', 'resources-toolbar');
        this.splitWidget().setMainWidget(mainContainer);
        this.mmkvStorageView = null;
        this.sidebar = new MMKVPanelSidebar(this);
        this.sidebar.show(this.panelSidebarElement());
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!mmkvPanelInstance || forceNew) {
            mmkvPanelInstance = new MMKVPanel();
        }
        return mmkvPanelInstance;
    }
    focus() {
        this.sidebar.focus();
    }
    wasShown() {
        super.wasShown();
        this.sidebar.selectFirstStorageIfNoneSelected();
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
    showCategoryView(_categoryName, categoryHeadline, categoryDescription, _categoryLink) {
        const categoryView = new UI.Widget.VBox();
        categoryView.element.classList.add('storage-category-view');
        const headline = categoryView.element.createChild('div', 'storage-category-headline');
        headline.textContent = categoryHeadline;
        const description = categoryView.element.createChild('div', 'storage-category-description');
        description.textContent = categoryDescription;
        this.showView(categoryView);
    }
}
/** MMKV panel sidebar: flat list of MMKV instances / MMKV 패널 사이드바: 인스턴스 목록 */
class MMKVPanelSidebar extends UI.Widget.VBox {
    panel;
    sidebarTree;
    mmkvStorageTreeElements;
    constructor(panel) {
        super();
        this.panel = panel;
        this.element.classList.add('storage-panel-sidebar');
        this.sidebarTree = new UI.TreeOutline.TreeOutlineInShadow();
        this.sidebarTree.element.classList.add('storage-panel-sidebar-tree');
        this.sidebarTree.setFocusable(true);
        this.element.appendChild(this.sidebarTree.element);
        this.mmkvStorageTreeElements = new Map();
        SDK.TargetManager.TargetManager.instance().observeModels(MMKVStorageModel, {
            modelAdded: (model) => this.mmkvStorageModelAdded(model),
            modelRemoved: (model) => this.mmkvStorageModelRemoved(model),
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
        this.addMMKVStorage(event.data);
    };
    addMMKVStorage(mmkvStorage) {
        if (this.mmkvStorageTreeElements.has(mmkvStorage)) {
            return;
        }
        const mmkvStorageTreeElement = new MMKVStorageTreeElement(this.panel, mmkvStorage);
        this.mmkvStorageTreeElements.set(mmkvStorage, mmkvStorageTreeElement);
        function comparator(a, b) {
            return a.titleAsText().toLocaleLowerCase().localeCompare(b.titleAsText().toLocaleLowerCase());
        }
        this.sidebarTree.appendChild(mmkvStorageTreeElement, comparator);
    }
    mmkvStorageRemoved = (event) => {
        this.removeMMKVStorage(event.data);
    };
    /** Select first storage in sidebar if none selected (e.g. on first panel entry) / 선택된 항목 없으면 첫 목록 선택 */
    selectFirstStorageIfNoneSelected() {
        if (this.sidebarTree.selectedTreeElement) {
            return;
        }
        const root = this.sidebarTree.rootElement();
        if (root.childCount() === 0) {
            return;
        }
        const first = root.childAt(0);
        if (first) {
            first.select();
        }
    }
    removeMMKVStorage(mmkvStorage) {
        const treeElement = this.mmkvStorageTreeElements.get(mmkvStorage);
        if (!treeElement) {
            return;
        }
        const wasSelected = treeElement.selected;
        this.sidebarTree.removeChild(treeElement);
        this.mmkvStorageTreeElements.delete(mmkvStorage);
        if (wasSelected && this.sidebarTree.rootElement().childCount() > 0) {
            const firstChild = this.sidebarTree.rootElement().childAt(0);
            if (firstChild) {
                firstChild.select();
            }
        }
    }
}
/** MMKV storage tree element (sidebar row) / MMKV 스토리지 트리 엘리먼트 */
class MMKVStorageTreeElement extends UI.TreeOutline.TreeElement {
    panel;
    mmkvStorage;
    constructor(panel, mmkvStorage) {
        super(mmkvStorage.instanceId, false, 'mmkv-storage-for-instance');
        this.panel = panel;
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
        this.panel.showMMKVStorage(this.mmkvStorage);
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
//# sourceMappingURL=MMKVPanel.js.map