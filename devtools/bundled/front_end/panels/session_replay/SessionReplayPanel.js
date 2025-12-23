// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
let sessionReplayPanelInstance;
export class SessionReplayPanel extends UI.Panel.Panel {
    constructor() {
        super('session-replay');
        this.render();
    }
    render() {
        const container = document.createElement('div');
        container.className = 'session-replay-panel';
        this.contentElement.appendChild(container);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!sessionReplayPanelInstance || forceNew) {
            sessionReplayPanelInstance = new SessionReplayPanel();
        }
        return sessionReplayPanelInstance;
    }
}
//# sourceMappingURL=SessionReplayPanel.js.map