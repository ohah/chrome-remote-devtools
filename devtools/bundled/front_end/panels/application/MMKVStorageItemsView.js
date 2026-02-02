// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/*
 * Copyright (C) 2008 Nokia Inc.  All rights reserved.
 * Copyright (C) 2013 Samsung Electronics. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives as LitDirectives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
import { StorageItemsToolbar } from './StorageItemsToolbar.js';
const { ARIAUtils } = UI;
const { EmptyWidget } = UI.EmptyWidget;
const { VBox, widgetConfig } = UI.Widget;
const { Size } = Geometry;
const { repeat } = LitDirectives;
/** Narrow literal union for MMKV value type / MMKV 값 타입 리터럴 유니온 */
const MMKV_VALUE_TYPES = ['string', 'number', 'boolean', 'buffer'];
/** Parse string to ValueType; returns null if not one of the allowed types / 문자열을 ValueType으로 파싱, 허용 타입이 아니면 null */
function parseValueType(s) {
    return MMKV_VALUE_TYPES.includes(s) ? s : null;
}
const UIStrings = {
    /**
     * @description Name for the "MMKV Storage Items" table that shows the content of the MMKV Storage.
     */
    mmkvStorageItems: 'MMKV Storage Items',
    /**
     * @description Text for announcing that the "MMKV Storage Items" table was cleared.
     */
    mmkvStorageItemsCleared: 'MMKV Storage Items cleared',
    /**
     * @description Text for announcing a MMKV Storage key/value item has been deleted
     */
    mmkvStorageItemDeleted: 'The storage item was deleted.',
    /**
     * @description Text that shows in the Application Panel if no value is selected for preview
     */
    noPreviewSelected: 'No value selected',
    /**
     * @description Preview text when viewing storage in Application panel
     */
    selectAValueToPreview: 'Select a value to preview',
    /**
     * @description Text for announcing number of entries after filtering
     * @example {5} PH1
     */
    numberEntries: 'Number of entries shown in table: {PH1}',
    /**
     * @description Column header for key
     */
    key: 'Key',
    /**
     * @description Column header for type
     */
    type: 'Type',
    /**
     * @description Column header for value
     */
    value: 'Value',
    /**
     * @description Warning when value is invalid for number type
     */
    invalidNumberValue: 'Invalid number: value must be a valid number.',
    /**
     * @description Warning when value is invalid for buffer type
     */
    invalidBufferValue: 'Invalid buffer: value must be a JSON array of numbers (e.g. [0,1,2]).',
    /**
     * @description Warning when value is invalid for boolean type
     */
    invalidBooleanValue: 'Invalid boolean: value must be "true" or "false".',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/MMKVStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const MAX_VALUE_LENGTH = 4096;
/**
 * Validate value string for given MMKV type / MMKV 타입에 맞는 값 문자열 검증
 * @returns valid and optional error message
 */
export function validateValueForType(value, valueType) {
    if (valueType === 'string') {
        return { valid: true };
    }
    if (valueType === 'number') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return { valid: false, message: i18nString(UIStrings.invalidNumberValue) };
        }
        const n = Number(trimmed);
        if (!Number.isFinite(n)) {
            return { valid: false, message: i18nString(UIStrings.invalidNumberValue) };
        }
        return { valid: true };
    }
    if (valueType === 'boolean') {
        if (value !== 'true' && value !== 'false') {
            return { valid: false, message: i18nString(UIStrings.invalidBooleanValue) };
        }
        return { valid: true };
    }
    if (valueType === 'buffer') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return { valid: false, message: i18nString(UIStrings.invalidBufferValue) };
        }
        try {
            const parsed = JSON.parse(trimmed);
            if (!Array.isArray(parsed)) {
                return { valid: false, message: i18nString(UIStrings.invalidBufferValue) };
            }
            for (let i = 0; i < parsed.length; i++) {
                const v = parsed[i];
                if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 255) {
                    return { valid: false, message: i18nString(UIStrings.invalidBufferValue) };
                }
            }
            return { valid: true };
        }
        catch {
            return { valid: false, message: i18nString(UIStrings.invalidBufferValue) };
        }
    }
    return { valid: true };
}
/**
 * MMKV Storage Items View with Key, Value, Type columns and type-aware editing.
 * Uses Lit for the UI; does not reuse KeyValueStorageItemsView (Local Storage style) because MMKV has typed values.
 */
export class MMKVStorageItemsView extends UI.Widget.VBox {
    #mmkvStorage;
    #eventListeners = [];
    #items = [];
    #selectedKey = null;
    #isSortOrderAscending = true;
    #toolbar;
    #preview;
    #previewValue = null;
    #metadataView;
    constructor(mmkvStorage) {
        super();
        this.#mmkvStorage = mmkvStorage;
        this.#metadataView = new ApplicationComponents.StorageMetadataView.StorageMetadataView();
        this.#metadataView.getTitle = () => mmkvStorage.instanceId;
        this.#preview =
            new EmptyWidget(i18nString(UIStrings.noPreviewSelected), i18nString(UIStrings.selectAValueToPreview));
        this.element.classList.add('storage-view', 'table');
        this.setStorage(mmkvStorage);
        this.showPreview(null, null);
        this.performUpdate();
    }
    get storage() {
        return this.#mmkvStorage;
    }
    setStorage(mmkvStorage) {
        Common.EventTarget.removeEventListeners(this.#eventListeners);
        this.#mmkvStorage = mmkvStorage;
        this.#metadataView.getTitle = () => mmkvStorage.instanceId;
        this.element.setAttribute('jslog', `${VisualLogging.pane().context('mmkv-storage-data')}`);
        this.#eventListeners = [
            mmkvStorage.addEventListener("MMKVItemsCleared" /* MMKVStorage.Events.MMKV_ITEMS_CLEARED */, this.#itemsCleared, this),
            mmkvStorage.addEventListener("MMKVItemRemoved" /* MMKVStorage.Events.MMKV_ITEM_REMOVED */, this.#itemRemoved, this),
            mmkvStorage.addEventListener("MMKVItemAdded" /* MMKVStorage.Events.MMKV_ITEM_ADDED */, this.#itemAdded, this),
            mmkvStorage.addEventListener("MMKVItemUpdated" /* MMKVStorage.Events.MMKV_ITEM_UPDATED */, this.#itemUpdated, this),
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
    async #refreshItems() {
        const entries = await this.#mmkvStorage.getItems();
        if (!entries || !this.#toolbar) {
            return;
        }
        const filterRegex = this.#toolbar.filterRegex;
        const items = entries
            .map((row) => {
            const key = row[0] ?? '';
            const value = row[1] ?? '';
            const rawType = row[2];
            const valueType = (typeof rawType === 'string' ? parseValueType(rawType) : null) ?? 'string';
            return { key, value, valueType };
        })
            .filter(item => filterRegex?.test(`${item.key} ${item.value} ${item.valueType}`) ?? true);
        this.#showItems(items);
    }
    #showItems(items) {
        const sortDirection = this.#isSortOrderAscending ? 1 : -1;
        this.#items = [...items].sort((a, b) => sortDirection * (a.key > b.key ? 1 : a.key < b.key ? -1 : 0));
        const selected = this.#items.find(item => item.key === this.#selectedKey);
        if (!selected) {
            this.#selectedKey = null;
        }
        else {
            void this.#previewEntry(selected);
        }
        this.performUpdate();
        this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
        ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.numberEntries, { PH1: this.#items.length }));
    }
    #itemsCleared() {
        if (!this.isShowing()) {
            return;
        }
        this.#items = [];
        this.#selectedKey = null;
        this.performUpdate();
        this.#toolbar?.setCanDeleteSelected(false);
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.mmkvStorageItemsCleared));
    }
    #itemRemoved(event) {
        if (!this.isShowing()) {
            return;
        }
        const key = event.data.key;
        const index = this.#items.findIndex(item => item.key === key);
        if (index !== -1) {
            this.#items.splice(index, 1);
            if (this.#selectedKey === key) {
                this.#selectedKey = this.#items.length ? this.#items[0].key : null;
            }
            this.performUpdate();
        }
        this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.mmkvStorageItemDeleted));
    }
    #itemAdded(event) {
        if (!this.isShowing()) {
            return;
        }
        const { key, value, valueType: rawType } = event.data;
        const valueType = (typeof rawType === 'string' ? parseValueType(rawType) : null) ?? 'string';
        if (this.#items.some(item => item.key === key)) {
            return;
        }
        this.#items.push({ key, value, valueType });
        this.#items.sort((a, b) => (this.#isSortOrderAscending ? 1 : -1) * (a.key > b.key ? 1 : -1));
        this.performUpdate();
    }
    #itemUpdated(event) {
        if (!this.isShowing()) {
            return;
        }
        const { key, value, valueType: rawType } = event.data;
        const item = this.#items.find(i => i.key === key);
        if (!item) {
            return;
        }
        item.value = value;
        item.valueType =
            (typeof rawType === 'string' ? parseValueType(rawType) : null) ?? item.valueType;
        this.performUpdate();
        if (this.#selectedKey === key) {
            void this.#previewEntry(item);
        }
    }
    deleteAllItems() {
        this.#mmkvStorage.clear();
        this.#itemsCleared();
    }
    #deleteCallback(key) {
        this.#mmkvStorage.removeItem(key);
    }
    #createCallback(key, value, valueType) {
        this.#mmkvStorage.setItem(key, value, valueType);
        this.#removeDupes(key, value);
        void this.#previewEntry({ key, value, valueType });
    }
    #editingCallback(key, value, valueType, columnId, _valueBeforeEditing, newText) {
        if (columnId === 'key') {
            this.#mmkvStorage.removeItem(key);
            this.#mmkvStorage.setItem(newText, value, valueType);
            this.#removeDupes(newText, value);
            void this.#previewEntry({ key: newText, value, valueType });
            return;
        }
        if (columnId === 'type') {
            const newType = parseValueType(newText);
            if (newType === null) {
                this.performUpdate();
                return;
            }
            this.#mmkvStorage.setItem(key, value, newType);
            const item = this.#items.find(i => i.key === key);
            if (item) {
                item.valueType = newType;
            }
            this.performUpdate();
            return;
        }
        if (columnId === 'value') {
            this.#mmkvStorage.setItem(key, newText, valueType);
            const item = this.#items.find(i => i.key === key);
            if (item) {
                item.value = newText;
            }
            this.performUpdate();
            void this.#previewEntry({ key, value: newText, valueType });
        }
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
    #previewEntry(entry) {
        if (entry?.value !== undefined) {
            this.#selectedKey = entry.key;
            return this.createPreview(entry.key, entry.value).then(preview => {
                if (this.#selectedKey === entry.key) {
                    this.showPreview(preview, entry.value);
                }
            });
        }
        this.#selectedKey = null;
        this.showPreview(null, null);
        return Promise.resolve();
    }
    showPreview(preview, value) {
        if (this.#preview && this.#previewValue === value) {
            return;
        }
        if (this.#preview) {
            this.#preview.detach();
        }
        if (!preview) {
            preview = new EmptyWidget(i18nString(UIStrings.noPreviewSelected), i18nString(UIStrings.selectAValueToPreview));
        }
        this.#previewValue = value;
        this.#preview = preview;
        this.performUpdate();
    }
    createPreview(key, value) {
        const url = `mmkv://${this.#mmkvStorage.instanceId}/${key}`;
        const provider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(url, Common.ResourceType.resourceTypes.XHR, value);
        return SourceFrame.PreviewFactory.PreviewFactory.createPreview(provider, 'text/plain');
    }
    performUpdate() {
        const that = this;
        const setToolbar = (toolbar) => {
            that.#toolbar?.removeEventListener("DeleteSelected" /* StorageItemsToolbar.Events.DELETE_SELECTED */, that.deleteSelectedItem, that);
            that.#toolbar?.removeEventListener("DeleteAll" /* StorageItemsToolbar.Events.DELETE_ALL */, that.deleteAllItems, that);
            that.#toolbar?.removeEventListener("Refresh" /* StorageItemsToolbar.Events.REFRESH */, that.refreshItems, that);
            that.#toolbar = toolbar;
            that.#toolbar.addEventListener("DeleteSelected" /* StorageItemsToolbar.Events.DELETE_SELECTED */, that.deleteSelectedItem, that);
            that.#toolbar.addEventListener("DeleteAll" /* StorageItemsToolbar.Events.DELETE_ALL */, that.deleteAllItems, that);
            that.#toolbar.addEventListener("Refresh" /* StorageItemsToolbar.Events.REFRESH */, that.refreshItems, that);
        };
        render(
        // clang-format off
        html `
        <devtools-widget
          .widgetConfig=${widgetConfig(StorageItemsToolbar, { metadataView: this.#metadataView })}
          class=flex-none
          ${UI.Widget.widgetRef(StorageItemsToolbar, setToolbar)}
        ></devtools-widget>
        <devtools-split-view sidebar-position="second" name="mmkv-storage-split-view-state">
          <devtools-widget
            slot="main"
            .widgetConfig=${widgetConfig(VBox, { minimumSize: new Size(0, 50) })}
          >
            <devtools-data-grid
              .name=${'mmkv-storage-datagrid'}
              striped
              style="flex: auto"
              @sort=${(e) => {
            this.#isSortOrderAscending = e.detail.ascending;
            this.performUpdate();
        }}
              @refresh=${() => this.refreshItems()}
              @create=${(e) => {
            this.#createCallback(e.detail.key, e.detail.value, 'string');
        }}
              @deselect=${() => {
            this.#selectedKey = null;
            this.#toolbar?.setCanDeleteSelected(false);
            this.showPreview(null, null);
            this.performUpdate();
        }}
            >
              <table>
                <tr>
                  <th id="key" sortable editable>${i18nString(UIStrings.key)}</th>
                  <th id="value" editable>${i18nString(UIStrings.value)}</th>
                  <th id="type">${i18nString(UIStrings.type)}</th>
                </tr>
                ${repeat(this.#items, item => item.key, item => html `
                  <tr
                    data-key=${item.key}
                    data-value=${item.value}
                    data-value-type=${item.valueType}
                    @select=${() => {
            this.#selectedKey = item.key;
            this.#toolbar?.setCanDeleteSelected(true);
            void this.#previewEntry(item);
        }}
                    @edit=${(e) => {
            this.#editingCallback(item.key, item.value, item.valueType, e.detail.columnId, e.detail.valueBeforeEditing, e.detail.newText);
        }}
                    @delete=${() => this.#deleteCallback(item.key)}
                    selected=${(this.#selectedKey === item.key) || nothing}
                  >
                    <td>${item.key}</td>
                    <td>${item.value.substring(0, MAX_VALUE_LENGTH)}</td>
                    <td @click=${(e) => e.stopPropagation()} class="mmkv-type-cell">
                      <select
                        class="mmkv-type-select"
                        .value=${item.valueType}
                        @change=${(e) => {
            const select = e.target;
            const newType = parseValueType(select.value);
            if (newType !== null) {
                this.#editingCallback(item.key, item.value, item.valueType, 'type', item.valueType, newType);
            }
        }}
                      >
                        ${MMKV_VALUE_TYPES.map(t => html `<option value=${t}>${t}</option>`)}
                      </select>
                    </td>
                  </tr>
                `)}
                <tr placeholder></tr>
              </table>
            </devtools-data-grid>
          </devtools-widget>
          <devtools-widget
            slot="sidebar"
            .widgetConfig=${widgetConfig(VBox, { minimumSize: new Size(0, 50) })}
            jslog=${VisualLogging.pane('preview').track({ resize: true })}
          >
            ${this.#preview?.element}
          </devtools-widget>
        </devtools-split-view>`, 
        // clang-format on
        this.contentElement);
    }
    get toolbar() {
        return this.#toolbar;
    }
}
//# sourceMappingURL=MMKVStorageItemsView.js.map