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
import * as UI from '../../ui/legacy/legacy.js';
import { Directives as LitDirectives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
import { StorageItemsToolbar } from './StorageItemsToolbar.js';
import resourcesPanelStyles from './resourcesPanel.css.js';
const { ARIAUtils } = UI;
const { VBox, widgetConfig } = UI.Widget;
const { Size } = Geometry;
const { repeat } = LitDirectives;
/** Bump this when changing the view to verify cache / 캐시 확인용: 뷰 수정 시 증가 */
const MMKV_PANEL_VERSION = 1;
/** Narrow literal union for MMKV value type / MMKV 값 타입 리터럴 유니온 */
const MMKV_VALUE_TYPES = ['string', 'number', 'boolean', 'buffer'];
/** Parse string to ValueType; returns null if not one of the allowed types / 문자열을 ValueType으로 파싱, 허용 타입이 아니면 null */
function parseValueType(s) {
    return MMKV_VALUE_TYPES.includes(s) ? s : null;
}
/**
 * Normalize raw valueType from CDP (string or boolean) to ValueType.
 * Handles valueType sent as boolean true/false (e.g. from JSON) so type always shows correctly.
 * / CDP에서 오는 valueType(문자열 또는 boolean)을 ValueType으로 정규화. JSON 등으로 boolean으로 오면 올바르게 'boolean'으로 표시
 */
function normalizeValueType(raw) {
    if (raw === true || raw === false) {
        return 'boolean';
    }
    if (typeof raw === 'string') {
        const t = parseValueType(raw);
        if (t)
            return t;
    }
    return 'string';
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
    /**
     * @description Error when key is empty on update
     */
    keyRequired: 'Key is required.',
    /**
     * @description Update button label
     */
    update: 'Update',
    /**
     * @description Add item button label
     */
    addItem: 'Add item',
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
export class MMKVStorageItemsView extends UI.Widget.VBox {
    #mmkvStorage;
    #eventListeners = [];
    #items = [];
    #selectedKey = null;
    #isSortOrderAscending = true;
    #toolbar;
    #metadataView;
    /** Per-row draft (rowId -> draft). rowId is item.key for existing rows, 'new-' + id for new rows. / 행별 드래프트 */
    #drafts = new Map();
    /** Per-row validation error shown when Update is clicked with invalid data / Update 클릭 시 잘못된 데이터일 때 표시 */
    #validationErrors = new Map();
    /** Ids for "new" placeholder rows (Add item) / 새 항목 추가용 placeholder 행 id 목록 */
    #newRowIds = [];
    constructor(mmkvStorage) {
        super();
        this.#mmkvStorage = mmkvStorage;
        this.#metadataView = new ApplicationComponents.StorageMetadataView.StorageMetadataView();
        this.#metadataView.getTitle = () => mmkvStorage.instanceId;
        this.element.classList.add('storage-view', 'table');
        this.registerRequiredCSS(resourcesPanelStyles);
        this.setStorage(mmkvStorage);
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
    /**
     * Convert one entry row (array or object) to MMKVItem. Protocol is [key, value, valueType];
     * some layers may send object { key, value, valueType }. Always normalize valueType.
     * / 한 행(배열 또는 객체)을 MMKVItem으로 변환. 프로토콜은 [key, value, valueType]; 객체로 올 수도 있음.
     */
    #rowToItem(row) {
        const toStr = (x) => (x !== null && x !== undefined) ? String(x) : '';
        if (row !== null && typeof row === 'object' && !Array.isArray(row)) {
            const o = row;
            // Array-like object from protocol deserialization (e.g. { 0: key, 1: value, 2: valueType }) / 프로토콜 역직렬화로 오는 배열형 객체
            if ('0' in o || '1' in o || '2' in o) {
                return this.#rowToItem([o[0], o[1], o[2]]);
            }
            const key = toStr(o.key);
            const value = toStr(o.value);
            const rawType = o.valueType;
            if (key === '' && value === '' && rawType === undefined) {
                console.log('[MMKV] rowToItem(object) -> null', { row: o });
                return null;
            }
            const item = {
                key,
                value,
                valueType: normalizeValueType(rawType),
            };
            console.log('[MMKV] rowToItem(object) in:', o, '-> out:', item);
            return item;
        }
        const arr = Array.isArray(row) ? row : [];
        const a = String(arr[0] ?? '');
        const b = toStr(arr[1]);
        const c = arr[2];
        // Protocol: Item = [key, value, valueType]. If value/type are swapped, detect and fix.
        // Pass raw c/b to normalizeValueType so boolean true/false from JSON is handled.
        const isType = (s) => typeof s === 'string' && parseValueType(s) !== null;
        let key;
        let value;
        let valueType;
        if (isType(c)) {
            key = a;
            value = b;
            valueType = normalizeValueType(c);
        }
        else if (isType(b)) {
            key = a;
            value = toStr(c);
            valueType = normalizeValueType(b);
        }
        else {
            key = a;
            value = b;
            valueType = normalizeValueType(c);
        }
        const item = { key, value, valueType };
        console.log('[MMKV] rowToItem(array) in:', row, '-> out:', item);
        return item;
    }
    async #refreshItems() {
        const raw = await this.#mmkvStorage.getItems();
        const entries = Array.isArray(raw) ? raw : [];
        console.log('[MMKV] getItems() raw:', raw);
        console.log('[MMKV] raw type:', Array.isArray(raw) ? 'array' : typeof raw, 'length:', entries.length, 'first:', entries[0]);
        const filterRegex = this.#toolbar?.filterRegex ?? null;
        const items = entries
            .map((row) => this.#rowToItem(row))
            .filter((item) => item !== null)
            .filter(item => filterRegex?.test(`${item.key} ${item.value} ${item.valueType}`) ?? true);
        console.log('[MMKV] #refreshItems final items:', items);
        this.#showItems(items);
    }
    #showItems(items) {
        const sortDirection = this.#isSortOrderAscending ? 1 : -1;
        this.#items = [...items].sort((a, b) => sortDirection * (a.key > b.key ? 1 : a.key < b.key ? -1 : 0));
        const selected = this.#items.find(item => item.key === this.#selectedKey);
        if (!selected) {
            this.#selectedKey = null;
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
        this.#drafts.clear();
        this.#validationErrors.clear();
        this.#newRowIds = [];
        this.performUpdate();
        this.#toolbar?.setCanDeleteSelected(false);
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.mmkvStorageItemsCleared));
    }
    #itemRemoved(event) {
        if (!this.isShowing()) {
            return;
        }
        const key = event.data.key;
        this.#drafts.delete(key);
        this.#validationErrors.delete(key);
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
        const valueType = normalizeValueType(rawType);
        if (this.#items.some(item => item.key === key)) {
            return;
        }
        this.#items.push({ key, value: String(value ?? ''), valueType });
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
        item.value = String(value ?? '');
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
    /** Get display values for a row (draft if any, else committed item) / 행 표시값 (드래프트 있으면 드래프트, 아니면 저장된 항목) */
    #getDisplayDraft(rowId, fallback) {
        return this.#drafts.get(rowId) ?? { ...fallback };
    }
    /** Set draft for a row; updates only when user clicks Update / 행 드래프트 설정; Update 클릭 시에만 반영 */
    #setDraft(rowId, patch) {
        const fallback = rowId.startsWith('new-')
            ? { key: '', value: '', valueType: 'string' }
            : this.#items.find(i => i.key === rowId) ?? { key: '', value: '', valueType: 'string' };
        const current = this.#getDisplayDraft(rowId, fallback);
        this.#drafts.set(rowId, { ...current, ...patch });
        this.#validationErrors.delete(rowId);
        this.performUpdate();
    }
    /** Handle Update button: validate, then setItem only if valid / Update 버튼: 검증 후 유효할 때만 setItem */
    #handleUpdateClick(rowId) {
        const isNew = rowId.startsWith('new-');
        const fallback = isNew ? { key: '', value: '', valueType: 'string' } : this.#items.find(i => i.key === rowId);
        const draft = this.#getDisplayDraft(rowId, fallback);
        if (!draft.key.trim()) {
            this.#validationErrors.set(rowId, i18nString(UIStrings.keyRequired));
            this.performUpdate();
            return;
        }
        const validation = validateValueForType(draft.value, draft.valueType);
        if (!validation.valid) {
            this.#validationErrors.set(rowId, validation.message ?? '');
            this.performUpdate();
            return;
        }
        this.#validationErrors.delete(rowId);
        if (isNew) {
            this.#mmkvStorage.setItem(draft.key.trim(), draft.value, draft.valueType);
            this.#drafts.delete(rowId);
            this.#newRowIds = this.#newRowIds.filter(id => 'new-' + id !== rowId);
            void this.#refreshItems();
        }
        else {
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
    /** Add a new placeholder row / 새 항목 행 추가 */
    #handleAddItem() {
        const id = String(Date.now());
        this.#newRowIds = [...this.#newRowIds, id];
        this.#drafts.set('new-' + id, { key: '', value: '', valueType: 'string' });
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
        const setToolbar = (toolbar) => {
            that.#toolbar?.removeEventListener("DeleteSelected" /* StorageItemsToolbar.Events.DELETE_SELECTED */, that.deleteSelectedItem, that);
            that.#toolbar?.removeEventListener("DeleteAll" /* StorageItemsToolbar.Events.DELETE_ALL */, that.deleteAllItems, that);
            that.#toolbar?.removeEventListener("Refresh" /* StorageItemsToolbar.Events.REFRESH */, that.refreshItems, that);
            that.#toolbar = toolbar;
            that.#toolbar.addEventListener("DeleteSelected" /* StorageItemsToolbar.Events.DELETE_SELECTED */, that.deleteSelectedItem, that);
            that.#toolbar.addEventListener("DeleteAll" /* StorageItemsToolbar.Events.DELETE_ALL */, that.deleteAllItems, that);
            that.#toolbar.addEventListener("Refresh" /* StorageItemsToolbar.Events.REFRESH */, that.refreshItems, that);
        };
        const sortDirection = this.#isSortOrderAscending ? 1 : -1;
        const sortedItems = [...this.#items].sort((a, b) => sortDirection * (a.key > b.key ? 1 : a.key < b.key ? -1 : 0));
        const rows = [
            ...sortedItems.map(item => ({ rowId: item.key, item })),
            ...this.#newRowIds.map(id => ({
                rowId: 'new-' + id,
                item: this.#getDisplayDraft('new-' + id, { key: '', value: '', valueType: 'string' }),
            })),
        ];
        render(
        // clang-format off
        html `
        <devtools-widget
          .widgetConfig=${widgetConfig(StorageItemsToolbar, { metadataView: this.#metadataView })}
          class=flex-none
          ${UI.Widget.widgetRef(StorageItemsToolbar, setToolbar)}
        ></devtools-widget>
        <devtools-widget
          .widgetConfig=${widgetConfig(VBox, { minimumSize: new Size(0, 50) })}
        >
            <div class="mmkv-custom-table-container" data-mmkv-view="custom">
              <div class="mmkv-toolbar-row">
                <span class="mmkv-panel-version" title="Cache check: bump in source to verify fresh bundle">MMKV (${MMKV_PANEL_VERSION})</span>
                <button class="mmkv-add-button" @click=${() => this.#handleAddItem()} jslog=${VisualLogging.action('mmkv-storage.add-item').track({ click: true })}>
                  ${i18nString(UIStrings.addItem)}
                </button>
              </div>
              <table class="mmkv-custom-table" data-mmkv-table="true">
                <thead>
                  <tr>
                    <th class="mmkv-th-key">${i18nString(UIStrings.key)}</th>
                    <th class="mmkv-th-type">${i18nString(UIStrings.type)}</th>
                    <th class="mmkv-th-value">${i18nString(UIStrings.value)}</th>
                    <th class="mmkv-th-actions">${i18nString(UIStrings.update)}</th>
                  </tr>
                </thead>
                <tbody>
                  ${repeat(rows, row => row.rowId, row => {
            const display = this.#getDisplayDraft(row.rowId, row.item);
            const err = this.#validationErrors.get(row.rowId);
            const isNew = row.rowId.startsWith('new-');
            return html `
                    <tr
                      class="mmkv-row ${!isNew && this.#selectedKey === row.rowId ? 'mmkv-row-selected' : ''}"
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
                          ${MMKV_VALUE_TYPES.map(t => html `<option value=${t}>${t}</option>`)}
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
                          @click=${(e) => { e.stopPropagation(); this.#handleUpdateClick(row.rowId); }}
                          jslog=${VisualLogging.action('mmkv-storage.update').track({ click: true })}
                        >${i18nString(UIStrings.update)}</button>
                      </td>
                    </tr>
                    ${err ? html `<tr class="mmkv-error-row"><td colspan="4" class="mmkv-validation-error">${err}</td></tr>` : nothing}
                    `;
        })}
                </tbody>
              </table>
            </div>
        </devtools-widget>`, 
        // clang-format on
        this.contentElement);
    }
    get toolbar() {
        return this.#toolbar;
    }
}
//# sourceMappingURL=MMKVStorageItemsView.js.map