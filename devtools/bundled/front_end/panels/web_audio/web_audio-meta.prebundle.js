// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Title of the WebAudio tool
     */
    webaudio: 'WebAudio',
    /**
     * @description A tags of WebAudio tool that can be searched in the command menu
     */
    audio: 'audio',
    /**
     * @description Command for showing the WebAudio tool
     */
    showWebaudio: 'Show WebAudio',
};
const str_ = i18n.i18n.registerUIStrings('panels/web_audio/web_audio-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedWebAudioModule;
async function loadWebAudioModule() {
    if (!loadedWebAudioModule) {
        loadedWebAudioModule = await import('./web_audio.js');
    }
    return loadedWebAudioModule;
}
// Chrome Remote DevTools: 지원하지 않는 패널이므로 등록하지 않음
// UI.ViewManager.registerViewExtension({
//   location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
//   id: 'web-audio',
//   title: i18nLazyString(UIStrings.webaudio),
//   commandPrompt: i18nLazyString(UIStrings.showWebaudio),
//   persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
//   order: 100,
//   async loadView() {
//     const WebAudio = await loadWebAudioModule();
//     return new WebAudio.WebAudioView.WebAudioView();
//   },
//   tags: [i18nLazyString(UIStrings.audio)],
// });
//# sourceMappingURL=web_audio-meta.prebundle.js.map