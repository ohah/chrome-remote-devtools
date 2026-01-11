var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/storage/StoragePanel.js
var StoragePanel_exports = {};
__export(StoragePanel_exports, {
  StoragePanel: () => StoragePanel,
  StoragePanelSidebar: () => StoragePanelSidebar
});
import * as Common6 from "./../../core/common/common.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import { createIcon } from "./../../ui/kit/kit.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/AsyncStorageStorageItemsView.js
import * as Common2 from "./../../core/common/common.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as SourceFrame from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents3 from "./../application/components/components.js";

// gen/front_end/panels/application/KeyValueStorageItemsView.js
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives as LitDirectives, html as html2, nothing, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents2 from "./../application/components/components.js";

// gen/front_end/panels/application/StorageItemsToolbar.js
import "./../../ui/legacy/legacy.js";
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents from "./../application/components/components.js";
var UIStrings = {
  /**
   * @description Text to refresh the page
   */
  refresh: "Refresh",
  /**
   * @description Text to clear everything
   */
  clearAll: "Clear All",
  /**
   * @description Tooltip text that appears when hovering over the largeicon delete button in the Service Worker Cache Views of the Application panel
   */
  deleteSelected: "Delete Selected",
  /**
   * @description Text that informs screen reader users that the storage table has been refreshed
   */
  refreshedStatus: "Table refreshed"
};
var str_ = i18n.i18n.registerUIStrings("panels/application/StorageItemsToolbar.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var { html, render } = Lit;
var DEFAULT_VIEW = (input, _output, target) => {
  render(
    // clang-format off
    html`
      <devtools-toolbar class="top-resources-toolbar"
                        jslog=${VisualLogging.toolbar()}>
        <devtools-button title=${i18nString(UIStrings.refresh)}
                         jslog=${VisualLogging.action("storage-items-view.refresh").track({
      click: true
    })}
                         @click=${input.onRefresh}
                         .iconName=${"refresh"}
                         .variant=${"toolbar"}></devtools-button>
        <devtools-toolbar-input type="filter"
                                ?disabled=${!input.filterItemEnabled}
                                @change=${input.onFilterChanged}
                                style="flex-grow:0.4"></devtools-toolbar-input>
        ${new UI.Toolbar.ToolbarSeparator().element}
        <devtools-button title=${input.deleteAllButtonTitle}
                         @click=${input.onDeleteAll}
                         id=storage-items-delete-all
                         ?disabled=${!input.deleteAllButtonEnabled}
                         jslog=${VisualLogging.action("storage-items-view.clear-all").track({
      click: true
    })}
                         .iconName=${input.deleteAllButtonIconName}
                         .variant=${"toolbar"}></devtools-button>
        <devtools-button title=${i18nString(UIStrings.deleteSelected)}
                         @click=${input.onDeleteSelected}
                         ?disabled=${!input.deleteSelectedButtonDisabled}
                         jslog=${VisualLogging.action("storage-items-view.delete-selected").track({
      click: true
    })}
                         .iconName=${"cross"}
                         .variant=${"toolbar"}></devtools-button>
        ${input.mainToolbarItems.map((item) => item.element)}
      </devtools-toolbar>
      ${input.metadataView}`,
    // clang-format on
    target
  );
};
var StorageItemsToolbar = class extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
  filterRegex;
  #metadataView;
  #view;
  #deleteAllButtonEnabled = true;
  #deleteSelectedButtonDisabled = true;
  #filterItemEnabled = true;
  #deleteAllButtonIconName = "clear";
  #deleteAllButtonTitle = i18nString(UIStrings.clearAll);
  #mainToolbarItems = [];
  constructor(element, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.filterRegex = null;
  }
  set metadataView(view) {
    this.#metadataView = view;
  }
  get metadataView() {
    if (!this.#metadataView) {
      this.#metadataView = new ApplicationComponents.StorageMetadataView.StorageMetadataView();
    }
    return this.#metadataView;
  }
  performUpdate() {
    const viewInput = {
      deleteAllButtonEnabled: this.#deleteAllButtonEnabled,
      deleteSelectedButtonDisabled: this.#deleteSelectedButtonDisabled,
      filterItemEnabled: this.#filterItemEnabled,
      deleteAllButtonIconName: this.#deleteAllButtonIconName,
      deleteAllButtonTitle: this.#deleteAllButtonTitle,
      mainToolbarItems: this.#mainToolbarItems,
      metadataView: this.metadataView,
      onFilterChanged: this.filterChanged.bind(this),
      onRefresh: () => {
        this.dispatchEventToListeners(
          "Refresh"
          /* StorageItemsToolbar.Events.REFRESH */
        );
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.refreshedStatus));
      },
      onDeleteAll: () => this.dispatchEventToListeners(
        "DeleteAll"
        /* StorageItemsToolbar.Events.DELETE_ALL */
      ),
      onDeleteSelected: () => this.dispatchEventToListeners(
        "DeleteSelected"
        /* StorageItemsToolbar.Events.DELETE_SELECTED */
      )
    };
    this.#view(viewInput, {}, this.contentElement);
  }
  setDeleteAllTitle(title) {
    this.#deleteAllButtonTitle = title;
    this.requestUpdate();
  }
  setDeleteAllGlyph(glyph) {
    this.#deleteAllButtonIconName = glyph;
    this.requestUpdate();
  }
  appendToolbarItem(item) {
    this.#mainToolbarItems.push(item);
    this.requestUpdate();
  }
  setStorageKey(storageKey) {
    this.metadataView.setStorageKey(storageKey);
  }
  filterChanged({ detail: text }) {
    this.filterRegex = text ? new RegExp(Platform.StringUtilities.escapeForRegExp(text), "i") : null;
    this.dispatchEventToListeners(
      "Refresh"
      /* StorageItemsToolbar.Events.REFRESH */
    );
  }
  hasFilter() {
    return Boolean(this.filterRegex);
  }
  setCanDeleteAll(enabled) {
    this.#deleteAllButtonEnabled = enabled;
    this.requestUpdate();
  }
  setCanDeleteSelected(enabled) {
    this.#deleteSelectedButtonDisabled = enabled;
    this.requestUpdate();
  }
  setCanFilter(enabled) {
    this.#filterItemEnabled = enabled;
    this.requestUpdate();
  }
};

// gen/front_end/panels/application/KeyValueStorageItemsView.js
var { ARIAUtils: ARIAUtils2 } = UI2;
var { EmptyWidget: EmptyWidget2 } = UI2.EmptyWidget;
var { VBox, widgetConfig } = UI2.Widget;
var { Size } = Geometry;
var { repeat } = LitDirectives;
var UIStrings2 = {
  /**
   * @description Text that shows in the Application Panel if no value is selected for preview
   */
  noPreviewSelected: "No value selected",
  /**
   * @description Preview text when viewing storage in Application panel
   */
  selectAValueToPreview: "Select a value to preview",
  /**
   * @description Text for announcing number of entries after filtering
   * @example {5} PH1
   */
  numberEntries: "Number of entries shown in table: {PH1}",
  /**
   * @description Text in DOMStorage Items View of the Application panel
   */
  key: "Key",
  /**
   * @description Text for the value of something
   */
  value: "Value"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/application/KeyValueStorageItemsView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var MAX_VALUE_LENGTH = 4096;
var KeyValueStorageItemsView = class extends UI2.Widget.VBox {
  #preview;
  #previewValue;
  #items = [];
  #selectedKey = null;
  #view;
  #isSortOrderAscending = true;
  #editable;
  #toolbar;
  metadataView;
  constructor(title, id, editable, view, metadataView, opts) {
    metadataView ??= new ApplicationComponents2.StorageMetadataView.StorageMetadataView();
    if (!view) {
      view = (input, output, target) => {
        render2(
          html2`
            <devtools-widget
              .widgetConfig=${widgetConfig(StorageItemsToolbar, { metadataView })}
              class=flex-none
              ${UI2.Widget.widgetRef(StorageItemsToolbar, (view2) => {
            output.toolbar = view2;
          })}
            ></devtools-widget>
            <devtools-split-view sidebar-position="second" name="${id}-split-view-state">
               <devtools-widget
                  slot="main"
                  .widgetConfig=${widgetConfig(VBox, { minimumSize: new Size(0, 50) })}>
                <devtools-data-grid
                  .name=${`${id}-datagrid-with-preview`}
                  striped
                  style="flex: auto"
                  @sort=${(e) => input.onSort(e.detail.ascending)}
                  @refresh=${input.onReferesh}
                  @create=${(e) => input.onCreate(e.detail.key, e.detail.value)}
                  @deselect=${() => input.onSelect(null)}
                >
                  <table>
                    <tr>
                      <th id="key" sortable ?editable=${input.editable}>
                        ${i18nString2(UIStrings2.key)}
                      </th>
                      <th id="value" ?editable=${input.editable}>
                        ${i18nString2(UIStrings2.value)}
                      </th>
                    </tr>
                    ${repeat(input.items, (item) => item.key, (item) => html2`
                      <tr data-key=${item.key} data-value=${item.value}
                          @select=${() => input.onSelect(item)}
                          @edit=${(e) => input.onEdit(item.key, item.value, e.detail.columnId, e.detail.valueBeforeEditing, e.detail.newText)}
                          @delete=${() => input.onDelete(item.key)}
                          selected=${input.selectedKey === item.key || nothing}>
                        <td>${item.key}</td>
                        <td>${item.value.substr(0, MAX_VALUE_LENGTH)}</td>
                      </tr>`)}
                      <tr placeholder></tr>
                  </table>
                </devtools-data-grid>
              </devtools-widget>
              <devtools-widget
                  slot="sidebar"
                  .widgetConfig=${widgetConfig(VBox, { minimumSize: new Size(0, 50) })}
                  jslog=${VisualLogging2.pane("preview").track({ resize: true })}>
               ${input.preview?.element}
              </devtools-widget>
            </devtools-split-view>`,
          // clang-format on
          target
        );
      };
    }
    super(opts);
    this.metadataView = metadataView;
    this.#editable = editable;
    this.#view = view;
    this.performUpdate();
    this.#preview = new EmptyWidget2(i18nString2(UIStrings2.noPreviewSelected), i18nString2(UIStrings2.selectAValueToPreview));
    this.#previewValue = null;
    this.showPreview(null, null);
  }
  wasShown() {
    super.wasShown();
    this.refreshItems();
  }
  performUpdate() {
    const that = this;
    const viewOutput = {
      set toolbar(toolbar2) {
        that.#toolbar?.removeEventListener("DeleteSelected", that.deleteSelectedItem, that);
        that.#toolbar?.removeEventListener("DeleteAll", that.deleteAllItems, that);
        that.#toolbar?.removeEventListener("Refresh", that.refreshItems, that);
        that.#toolbar = toolbar2;
        that.#toolbar.addEventListener("DeleteSelected", that.deleteSelectedItem, that);
        that.#toolbar.addEventListener("DeleteAll", that.deleteAllItems, that);
        that.#toolbar.addEventListener("Refresh", that.refreshItems, that);
      }
    };
    const viewInput = {
      items: this.#items,
      selectedKey: this.#selectedKey,
      editable: this.#editable,
      preview: this.#preview,
      onSelect: (item) => {
        this.#toolbar?.setCanDeleteSelected(Boolean(item));
        if (!item) {
          void this.#previewEntry(null);
        } else {
          void this.#previewEntry(item);
        }
      },
      onSort: (ascending) => {
        this.#isSortOrderAscending = ascending;
      },
      onCreate: (key, value) => {
        this.#createCallback(key, value);
      },
      onEdit: (key, value, columnId, valueBeforeEditing, newText) => {
        this.#editingCallback(key, value, columnId, valueBeforeEditing, newText);
      },
      onDelete: (key) => {
        this.#deleteCallback(key);
      },
      onReferesh: () => {
        this.refreshItems();
      }
    };
    this.#view(viewInput, viewOutput, this.contentElement);
  }
  get toolbar() {
    return this.#toolbar;
  }
  refreshItems() {
  }
  deleteAllItems() {
  }
  itemsCleared() {
    this.#items = [];
    this.performUpdate();
    this.#toolbar?.setCanDeleteSelected(false);
  }
  itemRemoved(key) {
    const index = this.#items.findIndex((item) => item.key === key);
    if (index === -1) {
      return;
    }
    this.#items.splice(index, 1);
    this.performUpdate();
    this.#toolbar?.setCanDeleteSelected(this.#items.length > 1);
  }
  itemAdded(key, value) {
    if (this.#items.some((item) => item.key === key)) {
      return;
    }
    this.#items.push({ key, value });
    this.performUpdate();
  }
  itemUpdated(key, value) {
    const item = this.#items.find((item2) => item2.key === key);
    if (!item) {
      return;
    }
    if (item.value === value) {
      return;
    }
    item.value = value;
    this.performUpdate();
    if (this.#selectedKey !== key) {
      return;
    }
    if (this.#previewValue !== value) {
      void this.#previewEntry({ key, value });
    }
    this.#toolbar?.setCanDeleteSelected(true);
  }
  showItems(items) {
    const sortDirection = this.#isSortOrderAscending ? 1 : -1;
    this.#items = [...items].sort((item1, item2) => sortDirection * (item1.key > item2.key ? 1 : -1));
    const selectedItem = this.#items.find((item) => item.key === this.#selectedKey);
    if (!selectedItem) {
      this.#selectedKey = null;
    } else {
      void this.#previewEntry(selectedItem);
    }
    this.performUpdate();
    this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
    ARIAUtils2.LiveAnnouncer.alert(i18nString2(UIStrings2.numberEntries, { PH1: this.#items.length }));
  }
  deleteSelectedItem() {
    if (!this.#selectedKey) {
      return;
    }
    this.#deleteCallback(this.#selectedKey);
  }
  #createCallback(key, value) {
    this.setItem(key, value);
    this.#removeDupes(key, value);
    void this.#previewEntry({ key, value });
  }
  isEditAllowed(_columnIdentifier, _oldText, _newText) {
    return true;
  }
  #editingCallback(key, value, columnIdentifier, oldText, newText) {
    if (!this.isEditAllowed(columnIdentifier, oldText, newText)) {
      return;
    }
    if (columnIdentifier === "key") {
      if (typeof oldText === "string") {
        this.removeItem(oldText);
      }
      this.setItem(newText, value);
      this.#removeDupes(newText, value);
      void this.#previewEntry({ key: newText, value });
    } else {
      this.setItem(key, newText);
      void this.#previewEntry({ key, value: newText });
    }
  }
  #removeDupes(key, value) {
    for (let i = this.#items.length - 1; i >= 0; --i) {
      const child = this.#items[i];
      if (child.key === key && value !== child.value) {
        this.#items.splice(i, 1);
      }
    }
  }
  #deleteCallback(key) {
    this.removeItem(key);
  }
  showPreview(preview, value) {
    if (this.#preview && this.#previewValue === value) {
      return;
    }
    if (this.#preview) {
      this.#preview.detach();
    }
    if (!preview) {
      preview = new EmptyWidget2(i18nString2(UIStrings2.noPreviewSelected), i18nString2(UIStrings2.selectAValueToPreview));
    }
    this.#previewValue = value;
    this.#preview = preview;
    this.performUpdate();
  }
  async #previewEntry(entry) {
    if (entry?.value) {
      this.#selectedKey = entry.key;
      const preview = await this.createPreview(entry.key, entry.value);
      if (this.#selectedKey === entry.key) {
        this.showPreview(preview, entry.value);
      }
    } else {
      this.#selectedKey = null;
      this.showPreview(null, null);
    }
  }
  set editable(editable) {
    this.#editable = editable;
    this.performUpdate();
  }
  keys() {
    return this.#items.map((item) => item.key);
  }
};

// gen/front_end/panels/application/AsyncStorageStorageItemsView.js
var UIStrings3 = {
  /**
   * @description Name for the "AsyncStorage Storage Items" table that shows the content of the AsyncStorage Storage.
   */
  asyncStorageStorageItems: "AsyncStorage Storage Items",
  /**
   * @description Text for announcing that the "AsyncStorage Storage Items" table was cleared, that is, all
   * entries were deleted.
   */
  asyncStorageStorageItemsCleared: "AsyncStorage Storage Items cleared",
  /**
   * @description Text for announcing a AsyncStorage Storage key/value item has been deleted
   */
  asyncStorageStorageItemDeleted: "The storage item was deleted."
};
var str_3 = i18n5.i18n.registerUIStrings("panels/application/AsyncStorageStorageItemsView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var AsyncStorageStorageItemsView = class extends KeyValueStorageItemsView {
  asyncStorageStorage;
  eventListeners;
  get storage() {
    return this.asyncStorageStorage;
  }
  constructor(asyncStorageStorage) {
    const metadataView = new ApplicationComponents3.StorageMetadataView.StorageMetadataView();
    metadataView.getTitle = () => asyncStorageStorage.instanceId;
    super(i18nString3(UIStrings3.asyncStorageStorageItems), "async-storage-storage", true, void 0, metadataView);
    this.asyncStorageStorage = asyncStorageStorage;
    this.element.classList.add("storage-view", "table");
    this.showPreview(null, null);
    this.eventListeners = [];
    this.setStorage(asyncStorageStorage);
  }
  createPreview(key, value) {
    const url = `async-storage://${this.asyncStorageStorage.instanceId}/${key}`;
    const provider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(url, Common2.ResourceType.resourceTypes.XHR, value);
    return SourceFrame.PreviewFactory.PreviewFactory.createPreview(provider, "text/plain");
  }
  setStorage(asyncStorageStorage) {
    Common2.EventTarget.removeEventListeners(this.eventListeners);
    this.asyncStorageStorage = asyncStorageStorage;
    this.element.setAttribute("jslog", `${VisualLogging3.pane().context("async-storage-storage-data")}`);
    this.eventListeners = [
      this.asyncStorageStorage.addEventListener("AsyncStorageItemsCleared", this.asyncStorageStorageItemsCleared, this),
      this.asyncStorageStorage.addEventListener("AsyncStorageItemRemoved", this.asyncStorageStorageItemRemoved, this),
      this.asyncStorageStorage.addEventListener("AsyncStorageItemAdded", this.asyncStorageStorageItemAdded, this),
      this.asyncStorageStorage.addEventListener("AsyncStorageItemUpdated", this.asyncStorageStorageItemUpdated, this)
    ];
    this.refreshItems();
  }
  asyncStorageStorageItemsCleared() {
    if (!this.isShowing()) {
      return;
    }
    this.itemsCleared();
  }
  itemsCleared() {
    super.itemsCleared();
    UI3.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.asyncStorageStorageItemsCleared));
  }
  asyncStorageStorageItemRemoved(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemRemoved(event.data.key);
  }
  itemRemoved(key) {
    super.itemRemoved(key);
    UI3.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.asyncStorageStorageItemDeleted));
  }
  asyncStorageStorageItemAdded(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemAdded(event.data.key, event.data.value);
  }
  asyncStorageStorageItemUpdated(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemUpdated(event.data.key, event.data.value);
  }
  refreshItems() {
    void this.#refreshItems();
  }
  async #refreshItems() {
    const items = await this.asyncStorageStorage.getItems();
    if (!items || !this.toolbar) {
      return;
    }
    const { filterRegex } = this.toolbar;
    const filteredItems = items.map((item) => ({ key: item[0], value: item[1] })).filter((item) => filterRegex?.test(`${item.key} ${item.value}`) ?? true);
    this.showItems(filteredItems);
  }
  deleteAllItems() {
    this.asyncStorageStorage.clear();
    this.asyncStorageStorageItemsCleared();
  }
  removeItem(key) {
    this.asyncStorageStorage?.removeItem(key);
  }
  setItem(key, value) {
    this.asyncStorageStorage?.setItem(key, value);
  }
};

// gen/front_end/panels/application/AsyncStorageStorageModel.js
import * as Common3 from "./../../core/common/common.js";
import * as SDK from "./../../core/sdk/sdk.js";
var AsyncStorageStorage = class extends Common3.ObjectWrapper.ObjectWrapper {
  model;
  #instanceId;
  constructor(model, instanceId) {
    super();
    this.model = model;
    this.#instanceId = instanceId;
  }
  get instanceId() {
    return this.#instanceId;
  }
  getItems() {
    return this.model.agent.invoke_getAsyncStorageItems({ instanceId: this.instanceId }).then(({ entries }) => entries);
  }
  setItem(key, value) {
    void this.model.agent.invoke_setAsyncStorageItem({ instanceId: this.instanceId, key, value });
  }
  removeItem(key) {
    void this.model.agent.invoke_removeAsyncStorageItem({ instanceId: this.instanceId, key });
  }
  clear() {
    void this.model.agent.invoke_clear({ instanceId: this.instanceId });
  }
};
var AsyncStorageStorageModel = class extends SDK.SDKModel.SDKModel {
  #storages;
  agent;
  enabled;
  constructor(target) {
    super(target);
    this.#storages = /* @__PURE__ */ new Map();
    this.agent = target.asyncStorageStorageAgent();
  }
  enable() {
    if (this.enabled) {
      return;
    }
    this.target().registerAsyncStorageStorageDispatcher(new AsyncStorageStorageDispatcher(this));
    void this.agent.invoke_enable();
    this.enabled = true;
  }
  asyncStorageItemsCleared({ instanceId }) {
    const asyncStorageStorage = this.storageForInstanceId(instanceId);
    if (!asyncStorageStorage) {
      return;
    }
    asyncStorageStorage.dispatchEventToListeners(
      "AsyncStorageItemsCleared"
      /* AsyncStorageStorage.Events.ASYNC_STORAGE_ITEMS_CLEARED */
    );
  }
  asyncStorageItemRemoved({ instanceId, key }) {
    const asyncStorageStorage = this.storageForInstanceId(instanceId);
    if (!asyncStorageStorage) {
      return;
    }
    const eventData = { key };
    asyncStorageStorage.dispatchEventToListeners("AsyncStorageItemRemoved", eventData);
  }
  asyncStorageItemAdded({ instanceId, key, newValue }) {
    let asyncStorageStorage = this.storageForInstanceId(instanceId);
    if (!asyncStorageStorage) {
      asyncStorageStorage = this.addStorage(instanceId);
    }
    const eventData = { key, value: newValue };
    asyncStorageStorage.dispatchEventToListeners("AsyncStorageItemAdded", eventData);
  }
  asyncStorageItemUpdated({ instanceId, key, oldValue, newValue }) {
    const asyncStorageStorage = this.storageForInstanceId(instanceId);
    if (!asyncStorageStorage) {
      return;
    }
    const eventData = { key, oldValue, value: newValue };
    asyncStorageStorage.dispatchEventToListeners("AsyncStorageItemUpdated", eventData);
  }
  asyncStorageInstanceCreated({ instanceId }) {
    this.addStorage(instanceId);
  }
  addStorage(instanceId) {
    const existing = this.#storages.get(instanceId);
    if (existing) {
      return existing;
    }
    const storage = new AsyncStorageStorage(this, instanceId);
    this.#storages.set(instanceId, storage);
    this.dispatchEventToListeners("AsyncStorageStorageAdded", storage);
    return storage;
  }
  storageForInstanceId(instanceId) {
    return this.#storages.get(instanceId) || null;
  }
  storages() {
    return Array.from(this.#storages.values());
  }
};
SDK.SDKModel.SDKModel.register(AsyncStorageStorageModel, { capabilities: 0, autostart: false });
var AsyncStorageStorageDispatcher = class {
  model;
  constructor(model) {
    this.model = model;
  }
  asyncStorageItemsCleared({ instanceId }) {
    this.model.asyncStorageItemsCleared({ instanceId });
  }
  asyncStorageItemRemoved({ instanceId, key }) {
    this.model.asyncStorageItemRemoved({ instanceId, key });
  }
  asyncStorageItemAdded({ instanceId, key, newValue }) {
    this.model.asyncStorageItemAdded({ instanceId, key, newValue });
  }
  asyncStorageItemUpdated({ instanceId, key, oldValue, newValue }) {
    this.model.asyncStorageItemUpdated({ instanceId, key, oldValue, newValue });
  }
  asyncStorageInstanceCreated({ instanceId }) {
    this.model.asyncStorageInstanceCreated({ instanceId });
  }
};

// gen/front_end/panels/application/MMKVStorageItemsView.js
import * as Common4 from "./../../core/common/common.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as TextUtils2 from "./../../models/text_utils/text_utils.js";
import * as SourceFrame2 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents4 from "./../application/components/components.js";
var UIStrings4 = {
  /**
   * @description Name for the "MMKV Storage Items" table that shows the content of the MMKV Storage.
   */
  mmkvStorageItems: "MMKV Storage Items",
  /**
   * @description Text for announcing that the "MMKV Storage Items" table was cleared, that is, all
   * entries were deleted.
   */
  mmkvStorageItemsCleared: "MMKV Storage Items cleared",
  /**
   * @description Text for announcing a MMKV Storage key/value item has been deleted
   */
  mmkvStorageItemDeleted: "The storage item was deleted."
};
var str_4 = i18n7.i18n.registerUIStrings("panels/application/MMKVStorageItemsView.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var MMKVStorageItemsView = class extends KeyValueStorageItemsView {
  mmkvStorage;
  eventListeners;
  get storage() {
    return this.mmkvStorage;
  }
  constructor(mmkvStorage) {
    const metadataView = new ApplicationComponents4.StorageMetadataView.StorageMetadataView();
    metadataView.getTitle = () => mmkvStorage.instanceId;
    super(i18nString4(UIStrings4.mmkvStorageItems), "mmkv-storage", true, void 0, metadataView);
    this.mmkvStorage = mmkvStorage;
    this.element.classList.add("storage-view", "table");
    this.showPreview(null, null);
    this.eventListeners = [];
    this.setStorage(mmkvStorage);
  }
  createPreview(key, value) {
    const url = `mmkv://${this.mmkvStorage.instanceId}/${key}`;
    const provider = TextUtils2.StaticContentProvider.StaticContentProvider.fromString(url, Common4.ResourceType.resourceTypes.XHR, value);
    return SourceFrame2.PreviewFactory.PreviewFactory.createPreview(provider, "text/plain");
  }
  setStorage(mmkvStorage) {
    Common4.EventTarget.removeEventListeners(this.eventListeners);
    this.mmkvStorage = mmkvStorage;
    this.element.setAttribute("jslog", `${VisualLogging4.pane().context("mmkv-storage-data")}`);
    this.eventListeners = [
      this.mmkvStorage.addEventListener("MMKVItemsCleared", this.mmkvStorageItemsCleared, this),
      this.mmkvStorage.addEventListener("MMKVItemRemoved", this.mmkvStorageItemRemoved, this),
      this.mmkvStorage.addEventListener("MMKVItemAdded", this.mmkvStorageItemAdded, this),
      this.mmkvStorage.addEventListener("MMKVItemUpdated", this.mmkvStorageItemUpdated, this)
    ];
    this.refreshItems();
  }
  mmkvStorageItemsCleared() {
    if (!this.isShowing()) {
      return;
    }
    this.itemsCleared();
  }
  itemsCleared() {
    super.itemsCleared();
    UI4.ARIAUtils.LiveAnnouncer.alert(i18nString4(UIStrings4.mmkvStorageItemsCleared));
  }
  mmkvStorageItemRemoved(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemRemoved(event.data.key);
  }
  itemRemoved(key) {
    super.itemRemoved(key);
    UI4.ARIAUtils.LiveAnnouncer.alert(i18nString4(UIStrings4.mmkvStorageItemDeleted));
  }
  mmkvStorageItemAdded(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemAdded(event.data.key, event.data.value);
  }
  mmkvStorageItemUpdated(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemUpdated(event.data.key, event.data.value);
  }
  refreshItems() {
    void this.#refreshItems();
  }
  async #refreshItems() {
    const items = await this.mmkvStorage.getItems();
    if (!items || !this.toolbar) {
      return;
    }
    const { filterRegex } = this.toolbar;
    const filteredItems = items.map((item) => ({ key: item[0], value: item[1] })).filter((item) => filterRegex?.test(`${item.key} ${item.value}`) ?? true);
    this.showItems(filteredItems);
  }
  deleteAllItems() {
    this.mmkvStorage.clear();
    this.mmkvStorageItemsCleared();
  }
  removeItem(key) {
    this.mmkvStorage?.removeItem(key);
  }
  setItem(key, value) {
    this.mmkvStorage?.setItem(key, value);
  }
};

// gen/front_end/panels/application/MMKVStorageModel.js
import * as Common5 from "./../../core/common/common.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
var MMKVStorage = class extends Common5.ObjectWrapper.ObjectWrapper {
  model;
  #instanceId;
  constructor(model, instanceId) {
    super();
    this.model = model;
    this.#instanceId = instanceId;
  }
  get instanceId() {
    return this.#instanceId;
  }
  getItems() {
    return this.model.agent.invoke_getMMKVItems({ instanceId: this.instanceId }).then(({ entries }) => entries);
  }
  setItem(key, value) {
    void this.model.agent.invoke_setMMKVItem({ instanceId: this.instanceId, key, value });
  }
  removeItem(key) {
    void this.model.agent.invoke_removeMMKVItem({ instanceId: this.instanceId, key });
  }
  clear() {
    void this.model.agent.invoke_clear({ instanceId: this.instanceId });
  }
};
var MMKVStorageModel = class extends SDK2.SDKModel.SDKModel {
  #storages;
  agent;
  enabled;
  constructor(target) {
    super(target);
    this.#storages = /* @__PURE__ */ new Map();
    this.agent = target.mmkvStorageAgent();
  }
  enable() {
    if (this.enabled) {
      return;
    }
    this.target().registerMMKVStorageDispatcher(new MMKVStorageDispatcher(this));
    void this.agent.invoke_enable();
    this.enabled = true;
  }
  mmkvItemsCleared({ instanceId }) {
    const mmkvStorage = this.storageForInstanceId(instanceId);
    if (!mmkvStorage) {
      return;
    }
    mmkvStorage.dispatchEventToListeners(
      "MMKVItemsCleared"
      /* MMKVStorage.Events.MMKV_ITEMS_CLEARED */
    );
  }
  mmkvItemRemoved({ instanceId, key }) {
    const mmkvStorage = this.storageForInstanceId(instanceId);
    if (!mmkvStorage) {
      return;
    }
    const eventData = { key };
    mmkvStorage.dispatchEventToListeners("MMKVItemRemoved", eventData);
  }
  mmkvItemAdded({ instanceId, key, newValue }) {
    let mmkvStorage = this.storageForInstanceId(instanceId);
    if (!mmkvStorage) {
      mmkvStorage = this.addStorage(instanceId);
    }
    const eventData = { key, value: newValue };
    mmkvStorage.dispatchEventToListeners("MMKVItemAdded", eventData);
  }
  mmkvItemUpdated({ instanceId, key, oldValue, newValue }) {
    const mmkvStorage = this.storageForInstanceId(instanceId);
    if (!mmkvStorage) {
      return;
    }
    const eventData = { key, oldValue, value: newValue };
    mmkvStorage.dispatchEventToListeners("MMKVItemUpdated", eventData);
  }
  mmkvInstanceCreated({ instanceId }) {
    this.addStorage(instanceId);
  }
  addStorage(instanceId) {
    const existing = this.#storages.get(instanceId);
    if (existing) {
      return existing;
    }
    const storage = new MMKVStorage(this, instanceId);
    this.#storages.set(instanceId, storage);
    this.dispatchEventToListeners("MMKVStorageAdded", storage);
    return storage;
  }
  storageForInstanceId(instanceId) {
    return this.#storages.get(instanceId) || null;
  }
  storages() {
    return Array.from(this.#storages.values());
  }
};
SDK2.SDKModel.SDKModel.register(MMKVStorageModel, { capabilities: 0, autostart: false });
var MMKVStorageDispatcher = class {
  model;
  constructor(model) {
    this.model = model;
  }
  mmkvItemsCleared({ instanceId }) {
    this.model.mmkvItemsCleared({ instanceId });
  }
  mmkvItemRemoved({ instanceId, key }) {
    this.model.mmkvItemRemoved({ instanceId, key });
  }
  mmkvItemAdded({ instanceId, key, newValue }) {
    this.model.mmkvItemAdded({ instanceId, key, newValue });
  }
  mmkvItemUpdated({ instanceId, key, oldValue, newValue }) {
    this.model.mmkvItemUpdated({ instanceId, key, oldValue, newValue });
  }
  mmkvInstanceCreated({ instanceId }) {
    this.model.mmkvInstanceCreated({ instanceId });
  }
};

// gen/front_end/panels/storage/StoragePanel.js
var storagePanelInstance;
var StoragePanel = class _StoragePanel extends UI5.Panel.PanelWithSidebar {
  visibleView;
  pendingViewPromise;
  storageViews;
  storageViewToolbar;
  mmkvStorageView;
  asyncStorageStorageView;
  sidebar;
  constructor() {
    super("storage");
    this.visibleView = null;
    this.pendingViewPromise = null;
    const mainContainer = new UI5.Widget.VBox();
    mainContainer.setMinimumSize(100, 0);
    this.storageViews = mainContainer.element.createChild("div", "vbox flex-auto");
    this.storageViewToolbar = mainContainer.element.createChild("devtools-toolbar", "resources-toolbar");
    this.splitWidget().setMainWidget(mainContainer);
    this.mmkvStorageView = null;
    this.asyncStorageStorageView = null;
    this.sidebar = new StoragePanelSidebar(this);
    this.sidebar.show(this.panelSidebarElement());
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!storagePanelInstance || forceNew) {
      storagePanelInstance = new _StoragePanel();
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
    this.storageViewToolbar.classList.toggle("hidden", true);
    if (view instanceof UI5.View.SimpleView) {
      void view.toolbarItems().then((items) => {
        items.map((item) => this.storageViewToolbar.appendToolbarItem(item));
        this.storageViewToolbar.classList.toggle("hidden", !items.length);
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
    } else {
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
    } else {
      this.asyncStorageStorageView.setStorage(asyncStorageStorage);
    }
    this.showView(this.asyncStorageStorageView);
  }
  showCategoryView(categoryName, categoryHeadline, categoryDescription, _categoryLink) {
    const categoryView = new UI5.Widget.VBox();
    categoryView.element.classList.add("storage-category-view");
    const headline = categoryView.element.createChild("div", "storage-category-headline");
    headline.textContent = categoryHeadline;
    const description = categoryView.element.createChild("div", "storage-category-description");
    description.textContent = categoryDescription;
    this.showView(categoryView);
  }
};
var StoragePanelSidebar = class extends UI5.Widget.VBox {
  panel;
  sidebarTree;
  mmkvListTreeElement;
  asyncStorageListTreeElement;
  mmkvStorageTreeElements;
  asyncStorageStorageTreeElements;
  constructor(panel) {
    super();
    this.panel = panel;
    this.element.classList.add("storage-panel-sidebar");
    this.sidebarTree = new UI5.TreeOutline.TreeOutlineInShadow();
    this.sidebarTree.element.classList.add("storage-panel-sidebar-tree");
    this.sidebarTree.setFocusable(true);
    this.element.appendChild(this.sidebarTree.element);
    this.mmkvStorageTreeElements = /* @__PURE__ */ new Map();
    this.asyncStorageStorageTreeElements = /* @__PURE__ */ new Map();
    this.mmkvListTreeElement = new ExpandableStoragePanelTreeElement(this.panel, "MMKV", "No MMKV storage detected", "On this page you can view, add, edit, and delete MMKV storage key-value pairs.", "mmkv-storage");
    const mmkvIcon = createIcon("table");
    this.mmkvListTreeElement.setLeadingIcons([mmkvIcon]);
    this.sidebarTree.appendChild(this.mmkvListTreeElement);
    this.asyncStorageListTreeElement = new ExpandableStoragePanelTreeElement(this.panel, "AsyncStorage", "No AsyncStorage detected", "On this page you can view, add, edit, and delete AsyncStorage key-value pairs.", "async-storage");
    const asyncStorageIcon = createIcon("table");
    this.asyncStorageListTreeElement.setLeadingIcons([asyncStorageIcon]);
    this.sidebarTree.appendChild(this.asyncStorageListTreeElement);
    SDK3.TargetManager.TargetManager.instance().observeModels(MMKVStorageModel, {
      modelAdded: (model) => this.mmkvStorageModelAdded(model),
      modelRemoved: (model) => this.mmkvStorageModelRemoved(model)
    }, { scoped: true });
    SDK3.TargetManager.TargetManager.instance().observeModels(AsyncStorageStorageModel, {
      modelAdded: (model) => this.asyncStorageStorageModelAdded(model),
      modelRemoved: (model) => this.asyncStorageStorageModelRemoved(model)
    }, { scoped: true });
  }
  focus() {
    this.sidebarTree.focus();
  }
  mmkvStorageModelAdded(model) {
    model.addEventListener("MMKVStorageAdded", this.mmkvStorageAdded, this);
    model.addEventListener("MMKVStorageRemoved", this.mmkvStorageRemoved, this);
    model.enable();
    for (const storage of model.storages()) {
      this.addMMKVStorage(storage);
    }
  }
  mmkvStorageModelRemoved(model) {
    model.removeEventListener("MMKVStorageAdded", this.mmkvStorageAdded, this);
    model.removeEventListener("MMKVStorageRemoved", this.mmkvStorageRemoved, this);
    for (const storage of model.storages()) {
      this.removeMMKVStorage(storage);
    }
  }
  mmkvStorageAdded = (event) => {
    const mmkvStorage = event.data;
    this.addMMKVStorage(mmkvStorage);
  };
  addMMKVStorage(mmkvStorage) {
    if (this.mmkvStorageTreeElements.has(mmkvStorage)) {
      return;
    }
    const mmkvStorageTreeElement = new MMKVStorageTreeElement(this.panel, mmkvStorage);
    this.mmkvStorageTreeElements.set(mmkvStorage, mmkvStorageTreeElement);
    function comparator(a, b) {
      const aTitle = a.titleAsText().toLocaleLowerCase();
      const bTitle = b.titleAsText().toLocaleLowerCase();
      return aTitle.localeCompare(bTitle);
    }
    this.mmkvListTreeElement.appendChild(mmkvStorageTreeElement, comparator);
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
    model.addEventListener("AsyncStorageStorageAdded", this.asyncStorageStorageAdded, this);
    model.addEventListener("AsyncStorageStorageRemoved", this.asyncStorageStorageRemoved, this);
    model.enable();
    for (const storage of model.storages()) {
      this.addAsyncStorageStorage(storage);
    }
  }
  asyncStorageStorageModelRemoved(model) {
    model.removeEventListener("AsyncStorageStorageAdded", this.asyncStorageStorageAdded, this);
    model.removeEventListener("AsyncStorageStorageRemoved", this.asyncStorageStorageRemoved, this);
    for (const storage of model.storages()) {
      this.removeAsyncStorageStorage(storage);
    }
  }
  asyncStorageStorageAdded = (event) => {
    const asyncStorageStorage = event.data;
    this.addAsyncStorageStorage(asyncStorageStorage);
  };
  addAsyncStorageStorage(asyncStorageStorage) {
    if (this.asyncStorageStorageTreeElements.has(asyncStorageStorage)) {
      return;
    }
    if (this.asyncStorageStorageTreeElements.size === 0) {
      this.sidebarTree.removeChild(this.asyncStorageListTreeElement);
      const asyncStorageStorageTreeElement = new AsyncStorageStorageTreeElement(this.panel, asyncStorageStorage);
      this.asyncStorageStorageTreeElements.set(asyncStorageStorage, asyncStorageStorageTreeElement);
      this.sidebarTree.appendChild(asyncStorageStorageTreeElement);
      asyncStorageStorageTreeElement.select();
    } else {
      let comparator = function(a, b) {
        const aTitle = a.titleAsText().toLocaleLowerCase();
        const bTitle = b.titleAsText().toLocaleLowerCase();
        return aTitle.localeCompare(bTitle);
      };
      const asyncStorageStorageTreeElement = new AsyncStorageStorageTreeElement(this.panel, asyncStorageStorage);
      this.asyncStorageStorageTreeElements.set(asyncStorageStorage, asyncStorageStorageTreeElement);
      this.asyncStorageListTreeElement.appendChild(asyncStorageStorageTreeElement, comparator);
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
    if (this.asyncStorageStorageTreeElements.size === 1) {
      this.sidebarTree.removeChild(treeElement);
      this.asyncStorageStorageTreeElements.delete(asyncStorageStorage);
      const asyncStorageIcon = createIcon("table");
      this.asyncStorageListTreeElement.setLeadingIcons([asyncStorageIcon]);
      this.sidebarTree.appendChild(this.asyncStorageListTreeElement);
    } else {
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
};
var StoragePanelTreeElement = class extends UI5.TreeOutline.TreeElement {
  storagePanel;
  constructor(storagePanel, title, expandable, jslogContext) {
    super(title, expandable, jslogContext);
    this.storagePanel = storagePanel;
    UI5.ARIAUtils.setLabel(this.listItemElement, title);
    this.listItemElement.tabIndex = -1;
  }
  deselect() {
    super.deselect();
    this.listItemElement.tabIndex = -1;
  }
  get itemURL() {
    throw new Error("Unimplemented Method");
  }
  onselect(_selectedByUser) {
    return false;
  }
  showView(view) {
    this.storagePanel.showView(view);
  }
};
var ExpandableStoragePanelTreeElement = class extends StoragePanelTreeElement {
  expandedSetting;
  categoryName;
  categoryLink;
  emptyCategoryHeadline;
  categoryDescription;
  constructor(storagePanel, categoryName, emptyCategoryHeadline, categoryDescription, settingsKey, settingsDefault = false) {
    super(storagePanel, categoryName, false, settingsKey);
    this.expandedSetting = Common6.Settings.Settings.instance().createSetting("storage-" + settingsKey + "-expanded", settingsDefault);
    this.categoryName = categoryName;
    this.categoryLink = null;
    this.emptyCategoryHeadline = emptyCategoryHeadline;
    this.categoryDescription = categoryDescription;
  }
  get itemURL() {
    return "category://" + this.categoryName;
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
};
var MMKVStorageTreeElement = class extends StoragePanelTreeElement {
  mmkvStorage;
  constructor(storagePanel, mmkvStorage) {
    super(storagePanel, mmkvStorage.instanceId === "default" ? "MMKV (default)" : `MMKV (${mmkvStorage.instanceId})`, false, "mmkv-storage-for-instance");
    this.mmkvStorage = mmkvStorage;
    const icon = createIcon("table");
    this.setLeadingIcons([icon]);
    this.listItemElement.setAttribute("jslog", `${VisualLogging5.treeItem("mmkv-storage-instance")}`);
  }
  get itemURL() {
    return "mmkv-storage://" + this.mmkvStorage.instanceId;
  }
  onselect(_selectedByUser) {
    super.onselect(_selectedByUser);
    this.storagePanel.showMMKVStorage(this.mmkvStorage);
    return false;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI5.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem("Clear", () => this.mmkvStorage.clear(), { jslogContext: "clear" });
    void contextMenu.show();
  }
};
var AsyncStorageStorageTreeElement = class extends StoragePanelTreeElement {
  asyncStorageStorage;
  constructor(storagePanel, asyncStorageStorage) {
    super(storagePanel, "AsyncStorage", false, "async-storage-storage-for-instance");
    this.asyncStorageStorage = asyncStorageStorage;
    const icon = createIcon("table");
    this.setLeadingIcons([icon]);
    this.listItemElement.setAttribute("jslog", `${VisualLogging5.treeItem("async-storage-storage-instance")}`);
  }
  get itemURL() {
    return "async-storage-storage://" + this.asyncStorageStorage.instanceId;
  }
  onselect(_selectedByUser) {
    super.onselect(_selectedByUser);
    this.storagePanel.showAsyncStorageStorage(this.asyncStorageStorage);
    return false;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI5.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem("Clear", () => this.asyncStorageStorage.clear(), { jslogContext: "clear" });
    void contextMenu.show();
  }
};
export {
  StoragePanel_exports as StoragePanel
};
//# sourceMappingURL=storage.js.map
