import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ReactDevToolsModel } from './ReactDevToolsModel.js';
export declare class ReactDevToolsViewBase extends UI.View.SimpleView implements SDK.TargetManager.SDKModelObserver<ReactDevToolsModel> {
    #private;
    constructor(tab: 'components' | 'profiler', title: Platform.UIString.LocalizedString);
    modelAdded(model: ReactDevToolsModel): void;
    modelRemoved(model: ReactDevToolsModel): void;
}
