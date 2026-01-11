// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2008 Nokia Inc.  All rights reserved.
 * Copyright (C) 2013 Samsung Electronics. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
export class MMKVStorage extends Common.ObjectWrapper.ObjectWrapper {
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
        // Use CDP command - client will handle via registered handler / CDP 명령 사용 - 클라이언트가 등록된 핸들러를 통해 처리
        // Handler routes based on method name / 핸들러가 메서드 이름을 기준으로 라우팅
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
}
export class MMKVStorageModel extends SDK.SDKModel.SDKModel {
    #storages;
    agent;
    enabled;
    constructor(target) {
        super(target);
        this.#storages = new Map();
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
        mmkvStorage.dispatchEventToListeners("MMKVItemsCleared" /* MMKVStorage.Events.MMKV_ITEMS_CLEARED */);
    }
    mmkvItemRemoved({ instanceId, key }) {
        const mmkvStorage = this.storageForInstanceId(instanceId);
        if (!mmkvStorage) {
            return;
        }
        const eventData = { key };
        mmkvStorage.dispatchEventToListeners("MMKVItemRemoved" /* MMKVStorage.Events.MMKV_ITEM_REMOVED */, eventData);
    }
    mmkvItemAdded({ instanceId, key, newValue }) {
        let mmkvStorage = this.storageForInstanceId(instanceId);
        if (!mmkvStorage) {
            // Create storage if it doesn't exist / 존재하지 않으면 스토리지 생성
            mmkvStorage = this.addStorage(instanceId);
        }
        const eventData = { key, value: newValue };
        mmkvStorage.dispatchEventToListeners("MMKVItemAdded" /* MMKVStorage.Events.MMKV_ITEM_ADDED */, eventData);
    }
    mmkvItemUpdated({ instanceId, key, oldValue, newValue }) {
        const mmkvStorage = this.storageForInstanceId(instanceId);
        if (!mmkvStorage) {
            return;
        }
        const eventData = { key, oldValue, value: newValue };
        mmkvStorage.dispatchEventToListeners("MMKVItemUpdated" /* MMKVStorage.Events.MMKV_ITEM_UPDATED */, eventData);
    }
    mmkvInstanceCreated({ instanceId }) {
        // Create storage for new instance / 새 인스턴스에 대한 스토리지 생성
        this.addStorage(instanceId);
    }
    addStorage(instanceId) {
        const existing = this.#storages.get(instanceId);
        if (existing) {
            return existing;
        }
        const storage = new MMKVStorage(this, instanceId);
        this.#storages.set(instanceId, storage);
        this.dispatchEventToListeners("MMKVStorageAdded" /* Events.MMKV_STORAGE_ADDED */, storage);
        return storage;
    }
    storageForInstanceId(instanceId) {
        return this.#storages.get(instanceId) || null;
    }
    storages() {
        return Array.from(this.#storages.values());
    }
}
SDK.SDKModel.SDKModel.register(MMKVStorageModel, { capabilities: 0 /* SDK.Target.Capability.NONE */, autostart: false });
export class MMKVStorageDispatcher {
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
}
//# sourceMappingURL=MMKVStorageModel.js.map