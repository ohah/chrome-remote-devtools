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
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { KeyValueStorageItemsView } from './KeyValueStorageItemsView.js';
const UIStrings = {
    /**
     * @description Name for the "MMKV Storage Items" table that shows the content of the MMKV Storage.
     */
    mmkvStorageItems: 'MMKV Storage Items',
    /**
     * @description Text for announcing that the "MMKV Storage Items" table was cleared, that is, all
     * entries were deleted.
     */
    mmkvStorageItemsCleared: 'MMKV Storage Items cleared',
    /**
     * @description Text for announcing a MMKV Storage key/value item has been deleted
     */
    mmkvStorageItemDeleted: 'The storage item was deleted.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/MMKVStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class MMKVStorageItemsView extends KeyValueStorageItemsView {
    mmkvStorage;
    eventListeners;
    get storage() {
        return this.mmkvStorage;
    }
    constructor(mmkvStorage) {
        super(i18nString(UIStrings.mmkvStorageItems), 'mmkv-storage', true);
        this.mmkvStorage = mmkvStorage;
        this.element.classList.add('storage-view', 'table');
        this.showPreview(null, null);
        this.eventListeners = [];
        this.setStorage(mmkvStorage);
    }
    createPreview(key, value) {
        const url = `mmkv://${this.mmkvStorage.instanceId}/${key}`;
        const provider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(url, Common.ResourceType.resourceTypes.XHR, value);
        return SourceFrame.PreviewFactory.PreviewFactory.createPreview(provider, 'text/plain');
    }
    setStorage(mmkvStorage) {
        Common.EventTarget.removeEventListeners(this.eventListeners);
        this.mmkvStorage = mmkvStorage;
        this.element.setAttribute('jslog', `${VisualLogging.pane().context('mmkv-storage-data')}`);
        this.eventListeners = [
            this.mmkvStorage.addEventListener("MMKVItemsCleared" /* MMKVStorage.Events.MMKV_ITEMS_CLEARED */, this.mmkvStorageItemsCleared, this),
            this.mmkvStorage.addEventListener("MMKVItemRemoved" /* MMKVStorage.Events.MMKV_ITEM_REMOVED */, this.mmkvStorageItemRemoved, this),
            this.mmkvStorage.addEventListener("MMKVItemAdded" /* MMKVStorage.Events.MMKV_ITEM_ADDED */, this.mmkvStorageItemAdded, this),
            this.mmkvStorage.addEventListener("MMKVItemUpdated" /* MMKVStorage.Events.MMKV_ITEM_UPDATED */, this.mmkvStorageItemUpdated, this),
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
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.mmkvStorageItemsCleared));
    }
    mmkvStorageItemRemoved(event) {
        if (!this.isShowing()) {
            return;
        }
        this.itemRemoved(event.data.key);
    }
    itemRemoved(key) {
        super.itemRemoved(key);
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.mmkvStorageItemDeleted));
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
        const filteredItems = items.map(item => ({ key: item[0], value: item[1] }))
            .filter(item => filterRegex?.test(`${item.key} ${item.value}`) ?? true);
        this.showItems(filteredItems);
    }
    deleteAllItems() {
        this.mmkvStorage.clear();
        // explicitly clear the view because the event won't be fired when it has no items
        this.mmkvStorageItemsCleared();
    }
    removeItem(key) {
        this.mmkvStorage?.removeItem(key);
    }
    setItem(key, value) {
        this.mmkvStorage?.setItem(key, value);
    }
}
//# sourceMappingURL=MMKVStorageItemsView.js.map