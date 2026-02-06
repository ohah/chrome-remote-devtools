// gen/front_end/panels/mmkv/MMKVPanel.js
import * as SDK2 from "./../../core/sdk/sdk.js";
import { createIcon } from "./../../ui/kit/kit.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/mmkv/MMKVStorageModel.js
import * as Common from "./../../core/common/common.js";
import * as SDK from "./../../core/sdk/sdk.js";
var MMKVStorage = class extends Common.ObjectWrapper.ObjectWrapper {
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
    return this.model.agent.invoke_getMMKVItems({ instanceId: this.instanceId }).then((res) => res.entries);
  }
  setItem(key, value, valueType) {
    void this.model.agent.invoke_setMMKVItem({ instanceId: this.instanceId, key, value, valueType });
  }
  removeItem(key) {
    void this.model.agent.invoke_removeMMKVItem({ instanceId: this.instanceId, key });
  }
  clear() {
    void this.model.agent.invoke_clear({ instanceId: this.instanceId });
  }
};
var MMKVStorageModel = class extends SDK.SDKModel.SDKModel {
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
  mmkvItemAdded({ instanceId, key, newValue, valueType }) {
    let mmkvStorage = this.storageForInstanceId(instanceId);
    if (!mmkvStorage) {
      mmkvStorage = this.addStorage(instanceId);
    }
    const eventData = { key, value: newValue, valueType };
    mmkvStorage.dispatchEventToListeners("MMKVItemAdded", eventData);
  }
  mmkvItemUpdated({ instanceId, key, oldValue, newValue, valueType }) {
    const mmkvStorage = this.storageForInstanceId(instanceId);
    if (!mmkvStorage) {
      return;
    }
    const eventData = { key, oldValue, value: newValue, valueType };
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
SDK.SDKModel.SDKModel.register(MMKVStorageModel, { capabilities: 0, autostart: false });
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
  mmkvItemAdded({ instanceId, key, newValue, valueType }) {
    this.model.mmkvItemAdded({ instanceId, key, newValue, valueType });
  }
  mmkvItemUpdated({ instanceId, key, oldValue, newValue, valueType }) {
    this.model.mmkvItemUpdated({ instanceId, key, oldValue, newValue, valueType });
  }
  mmkvInstanceCreated({ instanceId }) {
    this.model.mmkvInstanceCreated({ instanceId });
  }
};

// gen/front_end/panels/mmkv/MMKVStorageItemsView.js
import * as Common3 from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives as LitDirectives, html as html2, nothing, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents2 from "./../application/components/components.js";

// gen/front_end/panels/application/StorageItemsToolbar.js
import "./../../ui/legacy/legacy.js";
import * as Common2 from "./../../core/common/common.js";
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
var StorageItemsToolbar = class extends Common2.ObjectWrapper.eventMixin(UI.Widget.VBox) {
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
    this.#deleteSelectedButtonDisabled = !enabled;
    this.requestUpdate();
  }
  setCanFilter(enabled) {
    this.#filterItemEnabled = enabled;
    this.requestUpdate();
  }
};

// gen/front_end/panels/mmkv/mmkv.css.js
var mmkv_css_default = `/* MMKV standalone panel styles / MMKV \uB2E8\uB3C5 \uD328\uB110 \uC2A4\uD0C0\uC77C */

.mmkv-view {
  display: flex;
  overflow: hidden;
}

.mmkv-view .data-grid:not(.inline) {
  border: none;
  flex: auto;
}

.mmkv-view .storage-table-error {
  color: var(--sys-color-error);
  font-size: 24px;
  font-weight: bold;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mmkv-view.query {
  padding: 2px 0;
  overflow: hidden auto;
}

.mmkv-view .filter-bar {
  border-top: none;
  border-bottom: 1px solid var(--sys-color-divider);
}

.mmkv-view .mmkv-type-cell {
  min-width: 80px;
}

.mmkv-view .mmkv-type-select {
  min-width: 80px;
}

.mmkv-view .mmkv-custom-table-container {
  flex: auto;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.mmkv-view .mmkv-toolbar-row {
  padding: 6px 8px;
  border-bottom: 1px solid var(--sys-color-divider);
}

.mmkv-view .mmkv-add-button {
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  border: none;
  border-radius: 4px;
}

.mmkv-view .mmkv-add-button:hover {
  opacity: 0.9;
}

.mmkv-view .mmkv-custom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.mmkv-view .mmkv-custom-table th {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--sys-color-divider);
  background: var(--sys-color-cdt-base-container);
  font-weight: 500;
}

.mmkv-view .mmkv-custom-table .mmkv-th-key { width: 20%; }
.mmkv-view .mmkv-custom-table .mmkv-th-type { width: 12%; min-width: 90px; }
.mmkv-view .mmkv-custom-table .mmkv-th-value { min-width: 120px; }
.mmkv-view .mmkv-custom-table .mmkv-th-actions { width: 140px; min-width: 140px; }

.mmkv-view .mmkv-custom-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--sys-color-outline-variant);
  vertical-align: middle;
}

.mmkv-view .mmkv-custom-table .mmkv-input {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 6px;
  border: 1px solid var(--sys-color-outline);
  border-radius: 4px;
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  font-size: 12px;
}

.mmkv-view .mmkv-custom-table .mmkv-input-value {
  min-width: 120px;
}

.mmkv-view .mmkv-custom-table .mmkv-td-actions {
  width: 140px;
  min-width: 140px;
  white-space: nowrap;
}

.mmkv-view .mmkv-custom-table .mmkv-update-button {
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
  border: none;
  border-radius: 4px;
  min-width: 60px;
}

.mmkv-view .mmkv-custom-table .mmkv-update-button:hover {
  opacity: 0.9;
}

.mmkv-view .mmkv-custom-table .mmkv-delete-button {
  padding: 4px 10px;
  margin-left: 6px;
  font-size: 12px;
  cursor: pointer;
  background: var(--sys-color-error-container);
  color: var(--sys-color-on-error-container);
  border: none;
  border-radius: 4px;
  min-width: 52px;
}

.mmkv-view .mmkv-custom-table .mmkv-delete-button:hover {
  opacity: 0.9;
}

.mmkv-view .mmkv-row {
  cursor: pointer;
}

.mmkv-view .mmkv-row:hover {
  background: var(--sys-color-surface-container-high);
}

.mmkv-view .mmkv-row-selected {
  background: var(--sys-color-surface-container-high);
}

.mmkv-view .mmkv-validation-error {
  color: var(--sys-color-error);
  font-size: 11px;
  padding: 2px 8px 6px !important;
}

.mmkv-view .mmkv-error-row td {
  border-bottom: none;
  padding-top: 0;
}

/*# sourceURL=${import.meta.resolve("./mmkv.css")} */`;

// gen/front_end/panels/mmkv/MMKVStorageItemsView.js
var { ARIAUtils: ARIAUtils3 } = UI2;
var { VBox, widgetConfig } = UI2.Widget;
var { Size } = Geometry;
var { repeat } = LitDirectives;
var MMKV_VALUE_TYPES = ["string", "number", "boolean", "buffer"];
function parseValueType(s) {
  return MMKV_VALUE_TYPES.includes(s) ? s : null;
}
function normalizeValueType(raw) {
  if (raw === true || raw === false) {
    return "boolean";
  }
  if (typeof raw === "string") {
    const t = parseValueType(raw);
    if (t)
      return t;
  }
  return "string";
}
var UIStrings2 = {
  /**
   * @description Name for the MMKV Storage Items table.
   */
  mmkvStorageItems: "MMKV Storage Items",
  /**
   * @description Text when MMKV Storage Items table was cleared.
   */
  mmkvStorageItemsCleared: "MMKV Storage Items cleared",
  /**
   * @description Text when a MMKV storage item was deleted.
   */
  mmkvStorageItemDeleted: "The storage item was deleted.",
  /**
   * @description Text for number of entries shown in table.
   * @example {5} PH1
   */
  numberEntries: "Number of entries shown in table: {PH1}",
  /**
   * @description Column header for key.
   */
  key: "Key",
  /**
   * @description Column header for type.
   */
  type: "Type",
  /**
   * @description Column header for value.
   */
  value: "Value",
  /**
   * @description Warning when value is invalid for number type.
   */
  invalidNumberValue: "Invalid number: value must be a valid number.",
  /**
   * @description Warning when value is invalid for buffer type.
   */
  invalidBufferValue: "Invalid buffer: value must be a JSON array of numbers (e.g. [0,1,2]).",
  /**
   * @description Warning when value is invalid for boolean type.
   */
  invalidBooleanValue: 'Invalid boolean: value must be "true" or "false".',
  /**
   * @description Error when key is empty on update.
   */
  keyRequired: "Key is required.",
  /**
   * @description Update button label.
   */
  update: "Update",
  /**
   * @description Delete button label (per row).
   */
  delete: "Delete",
  /**
   * @description Add item button label.
   */
  addItem: "Add item"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/mmkv/MMKVStorageItemsView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
function validateValueForType(value, valueType) {
  if (valueType === "string") {
    return { valid: true };
  }
  if (valueType === "number") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return { valid: false, message: i18nString2(UIStrings2.invalidNumberValue) };
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      return { valid: false, message: i18nString2(UIStrings2.invalidNumberValue) };
    }
    return { valid: true };
  }
  if (valueType === "boolean") {
    if (value !== "true" && value !== "false") {
      return { valid: false, message: i18nString2(UIStrings2.invalidBooleanValue) };
    }
    return { valid: true };
  }
  if (valueType === "buffer") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return { valid: false, message: i18nString2(UIStrings2.invalidBufferValue) };
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return { valid: false, message: i18nString2(UIStrings2.invalidBufferValue) };
      }
      for (let i = 0; i < parsed.length; i++) {
        const v = parsed[i];
        if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 255) {
          return { valid: false, message: i18nString2(UIStrings2.invalidBufferValue) };
        }
      }
      return { valid: true };
    } catch {
      return { valid: false, message: i18nString2(UIStrings2.invalidBufferValue) };
    }
  }
  return { valid: true };
}
var MMKVStorageItemsView = class extends UI2.Widget.VBox {
  #mmkvStorage;
  #eventListeners = [];
  #items = [];
  #selectedKey = null;
  #isSortOrderAscending = true;
  #toolbar;
  #metadataView;
  #drafts = /* @__PURE__ */ new Map();
  #validationErrors = /* @__PURE__ */ new Map();
  #newRowIds = [];
  constructor(mmkvStorage) {
    super();
    this.#mmkvStorage = mmkvStorage;
    this.#metadataView = new ApplicationComponents2.StorageMetadataView.StorageMetadataView();
    this.#metadataView.getTitle = () => mmkvStorage.instanceId;
    this.element.classList.add("mmkv-view", "table");
    this.registerRequiredCSS(mmkv_css_default);
    this.setStorage(mmkvStorage);
    this.performUpdate();
  }
  get storage() {
    return this.#mmkvStorage;
  }
  setStorage(mmkvStorage) {
    Common3.EventTarget.removeEventListeners(this.#eventListeners);
    this.#mmkvStorage = mmkvStorage;
    this.#metadataView.getTitle = () => mmkvStorage.instanceId;
    this.element.setAttribute("jslog", `${VisualLogging2.pane().context("mmkv-storage-data")}`);
    this.#eventListeners = [
      mmkvStorage.addEventListener("MMKVItemsCleared", this.#itemsCleared, this),
      mmkvStorage.addEventListener("MMKVItemRemoved", this.#itemRemoved, this),
      mmkvStorage.addEventListener("MMKVItemAdded", this.#itemAdded, this),
      mmkvStorage.addEventListener("MMKVItemUpdated", this.#itemUpdated, this)
    ];
    this.refreshItems();
  }
  wasShown() {
    super.wasShown();
    this.refreshItems();
  }
  refreshItems() {
    void this.#refreshItems();
  }
  #rowToItem(row) {
    const toStr = (x) => x !== null && x !== void 0 ? String(x) : "";
    if (row !== null && typeof row === "object" && !Array.isArray(row)) {
      const o = row;
      if ("0" in o || "1" in o || "2" in o) {
        return this.#rowToItem([o[0], o[1], o[2]]);
      }
      const key2 = toStr(o.key);
      const value2 = toStr(o.value);
      const rawType2 = o.valueType;
      if (key2 === "" && value2 === "" && rawType2 === void 0) {
        return null;
      }
      const valueType2 = normalizeValueType(rawType2);
      return { key: key2, value: value2, valueType: valueType2 };
    }
    const arr = Array.isArray(row) ? row : [];
    const key = String(arr[0] ?? "");
    const value = toStr(arr[1]);
    const rawType = arr[2];
    const valueType = normalizeValueType(rawType);
    return { key, value, valueType };
  }
  async #refreshItems() {
    const raw = await this.#mmkvStorage.getItems();
    const entries = Array.isArray(raw) ? raw : [];
    const filterRegex = this.#toolbar?.filterRegex ?? null;
    const items = entries.map((row) => this.#rowToItem(row)).filter((item) => item !== null).filter((item) => filterRegex?.test(`${item.key} ${item.value} ${item.valueType}`) ?? true);
    this.#showItems(items);
  }
  #showItems(items) {
    const sortDirection = this.#isSortOrderAscending ? 1 : -1;
    this.#items = [...items].sort((a, b) => sortDirection * (a.key > b.key ? 1 : a.key < b.key ? -1 : 0));
    for (const item of this.#items) {
      this.#drafts.delete(item.key);
    }
    const selected = this.#items.find((item) => item.key === this.#selectedKey);
    if (!selected) {
      this.#selectedKey = null;
    }
    this.performUpdate();
    this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
    ARIAUtils3.LiveAnnouncer.alert(i18nString2(UIStrings2.numberEntries, { PH1: this.#items.length }));
  }
  #itemsCleared() {
    if (!this.isShowing()) {
      return;
    }
    this.#items = [];
    this.#selectedKey = null;
    this.#drafts.clear();
    this.#validationErrors.clear();
    this.#newRowIds = [];
    this.performUpdate();
    this.#toolbar?.setCanDeleteAll(false);
    this.#toolbar?.setCanDeleteSelected(false);
    UI2.ARIAUtils.LiveAnnouncer.alert(i18nString2(UIStrings2.mmkvStorageItemsCleared));
  }
  #itemRemoved(event) {
    if (!this.isShowing()) {
      return;
    }
    const key = event.data.key;
    this.#drafts.delete(key);
    this.#validationErrors.delete(key);
    const index = this.#items.findIndex((item) => item.key === key);
    if (index !== -1) {
      this.#items.splice(index, 1);
      if (this.#selectedKey === key) {
        this.#selectedKey = this.#items.length ? this.#items[0].key : null;
      }
      this.performUpdate();
    }
    this.#toolbar?.setCanDeleteAll(this.#items.length > 0);
    this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
    UI2.ARIAUtils.LiveAnnouncer.alert(i18nString2(UIStrings2.mmkvStorageItemDeleted));
  }
  #itemAdded(event) {
    if (!this.isShowing()) {
      return;
    }
    const { key, value, valueType: rawType } = event.data;
    const valueStr = String(value ?? "");
    const valueType = normalizeValueType(rawType);
    if (this.#items.some((item) => item.key === key)) {
      return;
    }
    this.#items.push({ key, value: valueStr, valueType });
    this.#items.sort((a, b) => (this.#isSortOrderAscending ? 1 : -1) * (a.key > b.key ? 1 : -1));
    this.performUpdate();
  }
  #itemUpdated(event) {
    if (!this.isShowing()) {
      return;
    }
    const { key, value, valueType: rawType } = event.data;
    const item = this.#items.find((i) => i.key === key);
    if (!item) {
      return;
    }
    item.value = String(value ?? "");
    item.valueType = normalizeValueType(rawType);
    this.performUpdate();
  }
  deleteAllItems() {
    this.#mmkvStorage.clear();
    this.#itemsCleared();
  }
  #deleteCallback(key) {
    this.#mmkvStorage.removeItem(key);
  }
  #getDisplayDraft(rowId, fallback) {
    return this.#drafts.get(rowId) ?? { ...fallback };
  }
  #setDraft(rowId, patch) {
    const fallback = rowId.startsWith("new-") ? { key: "", value: "", valueType: "string" } : this.#items.find((i) => i.key === rowId) ?? { key: "", value: "", valueType: "string" };
    const current = this.#getDisplayDraft(rowId, fallback);
    this.#drafts.set(rowId, { ...current, ...patch });
    this.#validationErrors.delete(rowId);
    this.performUpdate();
  }
  #handleUpdateClick(rowId) {
    const isNew = rowId.startsWith("new-");
    const fallback = isNew ? { key: "", value: "", valueType: "string" } : this.#items.find((i) => i.key === rowId);
    const draft = this.#getDisplayDraft(rowId, fallback);
    if (!draft.key.trim()) {
      this.#validationErrors.set(rowId, i18nString2(UIStrings2.keyRequired));
      this.performUpdate();
      return;
    }
    const validation = validateValueForType(draft.value, draft.valueType);
    if (!validation.valid) {
      this.#validationErrors.set(rowId, validation.message ?? "");
      this.performUpdate();
      return;
    }
    this.#validationErrors.delete(rowId);
    if (isNew) {
      this.#mmkvStorage.setItem(draft.key.trim(), draft.value, draft.valueType);
      this.#drafts.delete(rowId);
      this.#newRowIds = this.#newRowIds.filter((id) => "new-" + id !== rowId);
      void this.#refreshItems();
    } else {
      const originalKey = rowId;
      if (draft.key.trim() !== originalKey) {
        this.#mmkvStorage.removeItem(originalKey);
      }
      this.#mmkvStorage.setItem(draft.key.trim(), draft.value, draft.valueType);
      this.#drafts.delete(rowId);
      void this.#refreshItems();
    }
    this.performUpdate();
  }
  #handleAddItem() {
    const id = String(Date.now());
    this.#newRowIds = [...this.#newRowIds, id];
    this.#drafts.set("new-" + id, { key: "", value: "", valueType: "string" });
    this.performUpdate();
  }
  #createCallback(key, value, valueType) {
    this.#mmkvStorage.setItem(key, value, valueType);
    this.#removeDupes(key, value);
  }
  #removeDupes(key, value) {
    for (let i = this.#items.length - 1; i >= 0; i--) {
      const child = this.#items[i];
      if (child.key === key && child.value !== value) {
        this.#items.splice(i, 1);
      }
    }
  }
  deleteSelectedItem() {
    if (!this.#selectedKey) {
      return;
    }
    this.#deleteCallback(this.#selectedKey);
  }
  performUpdate() {
    const that = this;
    const setToolbar = (toolbar2) => {
      that.#toolbar?.removeEventListener("DeleteSelected", that.deleteSelectedItem, that);
      that.#toolbar?.removeEventListener("DeleteAll", that.deleteAllItems, that);
      that.#toolbar?.removeEventListener("Refresh", that.refreshItems, that);
      that.#toolbar = toolbar2;
      that.#toolbar.addEventListener("DeleteSelected", that.deleteSelectedItem, that);
      that.#toolbar.addEventListener("DeleteAll", that.deleteAllItems, that);
      that.#toolbar.addEventListener("Refresh", that.refreshItems, that);
      that.#toolbar.setCanDeleteAll(that.#items.length > 0);
      that.#toolbar.setCanDeleteSelected(Boolean(that.#selectedKey));
    };
    const sortDirection = this.#isSortOrderAscending ? 1 : -1;
    const sortedItems = [...this.#items].sort((a, b) => sortDirection * (a.key > b.key ? 1 : a.key < b.key ? -1 : 0));
    const rows = [
      ...sortedItems.map((item) => ({ rowId: item.key, item })),
      ...this.#newRowIds.map((id) => ({
        rowId: "new-" + id,
        item: this.#getDisplayDraft("new-" + id, { key: "", value: "", valueType: "string" })
      }))
    ];
    render2(html2`
        <devtools-widget
          .widgetConfig=${widgetConfig(StorageItemsToolbar, { metadataView: this.#metadataView })}
          class=flex-none
          ${UI2.Widget.widgetRef(StorageItemsToolbar, setToolbar)}
        ></devtools-widget>
        <devtools-widget
          .widgetConfig=${widgetConfig(VBox, { minimumSize: new Size(0, 50) })}
        >
            <div class="mmkv-custom-table-container" data-mmkv-view="custom">
              <div class="mmkv-toolbar-row">
                <button class="mmkv-add-button" @click=${() => this.#handleAddItem()} jslog=${VisualLogging2.action("mmkv-storage.add-item").track({ click: true })}>
                  ${i18nString2(UIStrings2.addItem)}
                </button>
              </div>
              <table class="mmkv-custom-table" data-mmkv-table="true">
                <thead>
                  <tr>
                    <th class="mmkv-th-key">${i18nString2(UIStrings2.key)}</th>
                    <th class="mmkv-th-type">${i18nString2(UIStrings2.type)}</th>
                    <th class="mmkv-th-value">${i18nString2(UIStrings2.value)}</th>
                    <th class="mmkv-th-actions">${i18nString2(UIStrings2.update)}</th>
                  </tr>
                </thead>
                <tbody>
                  ${repeat(rows, (row) => row.rowId, (row) => {
      const display = this.#getDisplayDraft(row.rowId, row.item);
      const err = this.#validationErrors.get(row.rowId);
      const isNew = row.rowId.startsWith("new-");
      return html2`
                    <tr
                      class="mmkv-row ${!isNew && this.#selectedKey === row.rowId ? "mmkv-row-selected" : ""}"
                      @click=${(e) => {
        if (isNew)
          return;
        e.preventDefault();
        this.#selectedKey = row.item.key;
        this.#toolbar?.setCanDeleteSelected(true);
      }}
                    >
                      <td class="mmkv-td-key">
                        <input
                          class="mmkv-input"
                          .value=${display.key}
                          @input=${(e) => this.#setDraft(row.rowId, { key: e.target.value })}
                          @click=${(e) => e.stopPropagation()}
                        />
                      </td>
                      <td class="mmkv-td-type">
                        <select
                          class="mmkv-type-select"
                          .value=${display.valueType}
                          @change=${(e) => {
        const v = e.target.value;
        const t = parseValueType(v);
        if (t)
          this.#setDraft(row.rowId, { valueType: t });
      }}
                          @click=${(e) => e.stopPropagation()}
                        >
                          ${MMKV_VALUE_TYPES.map((t) => html2`<option value=${t} .selected=${t === display.valueType}>${t}</option>`)}
                        </select>
                      </td>
                      <td class="mmkv-td-value">
                        <input
                          class="mmkv-input mmkv-input-value"
                          .value=${display.value}
                          @input=${(e) => this.#setDraft(row.rowId, { value: e.target.value })}
                          @click=${(e) => e.stopPropagation()}
                        />
                      </td>
                      <td class="mmkv-td-actions">
                        <button
                          class="mmkv-update-button"
                          @click=${(e) => {
        e.stopPropagation();
        this.#handleUpdateClick(row.rowId);
      }}
                          jslog=${VisualLogging2.action("mmkv-storage.update").track({ click: true })}
                        >${i18nString2(UIStrings2.update)}</button>
                        ${!isNew ? html2`<button
                              class="mmkv-delete-button"
                              @click=${(e) => {
        e.stopPropagation();
        const key = row.item.key;
        this.#deleteCallback(key);
        const idx = this.#items.findIndex((i) => i.key === key);
        if (idx !== -1) {
          this.#items.splice(idx, 1);
          if (this.#selectedKey === key) {
            this.#selectedKey = this.#items.length ? this.#items[0].key : null;
          }
          this.#drafts.delete(key);
          this.#validationErrors.delete(key);
        }
        this.#toolbar?.setCanDeleteAll(this.#items.length > 0);
        this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
        this.performUpdate();
      }}
                              jslog=${VisualLogging2.action("mmkv-storage.delete").track({ click: true })}
                            >${i18nString2(UIStrings2.delete)}</button>` : nothing}
                      </td>
                    </tr>
                    ${err ? html2`<tr class="mmkv-error-row"><td colspan="4" class="mmkv-validation-error">${err}</td></tr>` : nothing}
                    `;
    })}
                </tbody>
              </table>
            </div>
        </devtools-widget>`, this.contentElement);
    this.#toolbar?.setCanDeleteAll(this.#items.length > 0);
    this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
  }
  get toolbar() {
    return this.#toolbar;
  }
};

// gen/front_end/panels/mmkv/MMKVPanel.js
var mmkvPanelInstance = null;
var MMKVPanel = class _MMKVPanel extends UI3.Panel.PanelWithSidebar {
  visibleView;
  pendingViewPromise;
  storageViews;
  storageViewToolbar;
  mmkvStorageView;
  sidebar;
  constructor() {
    super("mmkv");
    this.visibleView = null;
    this.pendingViewPromise = null;
    const mainContainer = new UI3.Widget.VBox();
    mainContainer.setMinimumSize(100, 0);
    this.storageViews = mainContainer.element.createChild("div", "vbox flex-auto");
    this.storageViewToolbar = mainContainer.element.createChild("devtools-toolbar", "resources-toolbar");
    this.splitWidget().setMainWidget(mainContainer);
    this.mmkvStorageView = null;
    this.sidebar = new MMKVPanelSidebar(this);
    this.sidebar.show(this.panelSidebarElement());
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!mmkvPanelInstance || forceNew) {
      mmkvPanelInstance = new _MMKVPanel();
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
    this.storageViewToolbar.classList.toggle("hidden", true);
    if (view instanceof UI3.View.SimpleView) {
      void view.toolbarItems().then((items) => {
        items.map((item) => this.storageViewToolbar.appendToolbarItem(item));
        this.storageViewToolbar.classList.toggle("hidden", !items.length);
      });
    }
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
  showCategoryView(_categoryName, categoryHeadline, categoryDescription, _categoryLink) {
    const categoryView = new UI3.Widget.VBox();
    categoryView.element.classList.add("storage-category-view");
    const headline = categoryView.element.createChild("div", "storage-category-headline");
    headline.textContent = categoryHeadline;
    const description = categoryView.element.createChild("div", "storage-category-description");
    description.textContent = categoryDescription;
    this.showView(categoryView);
  }
};
var MMKVPanelSidebar = class extends UI3.Widget.VBox {
  panel;
  sidebarTree;
  mmkvStorageTreeElements;
  constructor(panel) {
    super();
    this.panel = panel;
    this.element.classList.add("storage-panel-sidebar");
    this.sidebarTree = new UI3.TreeOutline.TreeOutlineInShadow();
    this.sidebarTree.element.classList.add("storage-panel-sidebar-tree");
    this.sidebarTree.setFocusable(true);
    this.element.appendChild(this.sidebarTree.element);
    this.mmkvStorageTreeElements = /* @__PURE__ */ new Map();
    SDK2.TargetManager.TargetManager.instance().observeModels(MMKVStorageModel, {
      modelAdded: (model) => this.mmkvStorageModelAdded(model),
      modelRemoved: (model) => this.mmkvStorageModelRemoved(model)
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
};
var MMKVStorageTreeElement = class extends UI3.TreeOutline.TreeElement {
  panel;
  mmkvStorage;
  constructor(panel, mmkvStorage) {
    super(mmkvStorage.instanceId, false, "mmkv-storage-for-instance");
    this.panel = panel;
    this.mmkvStorage = mmkvStorage;
    const icon = createIcon("table");
    this.setLeadingIcons([icon]);
    this.listItemElement.setAttribute("jslog", `${VisualLogging3.treeItem("mmkv-storage-instance")}`);
  }
  get itemURL() {
    return "mmkv-storage://" + this.mmkvStorage.instanceId;
  }
  onselect(_selectedByUser) {
    super.onselect(_selectedByUser);
    this.panel.showMMKVStorage(this.mmkvStorage);
    return false;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI3.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem("Clear", () => this.mmkvStorage.clear(), { jslogContext: "clear" });
    void contextMenu.show();
  }
};
export {
  MMKVPanel
};
//# sourceMappingURL=mmkv.js.map
