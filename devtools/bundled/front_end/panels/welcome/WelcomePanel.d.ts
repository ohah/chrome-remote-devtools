import * as UI from '../../ui/legacy/legacy.js';
import '../../ui/kit/kit.js';
export declare class WelcomePanel extends UI.Panel.Panel {
    constructor();
    private render;
    static instance(opts?: {
        forceNew: boolean | null;
    }): WelcomePanel;
}
