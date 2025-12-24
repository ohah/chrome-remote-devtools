import * as UI from '../../ui/legacy/legacy.js';
export declare class SessionReplayPanel extends UI.Panel.Panel {
    #private;
    constructor();
    wasShown(): void;
    private setupCDPListener;
    private attachToTarget;
    private render;
    private updateContainerHeight;
    private createControls;
    private togglePlayPause;
    private updatePlayPauseButton;
    private handleProgressClick;
    private startProgressUpdate;
    private stopProgressUpdate;
    private updateProgress;
    private formatTime;
    private calculateTotalTime;
    private injectRrwebStyles;
    private updateReplay;
    private setupReplayerEvents;
    willHide(): void;
    static instance(opts?: {
        forceNew: boolean | null;
    }): SessionReplayPanel;
}
