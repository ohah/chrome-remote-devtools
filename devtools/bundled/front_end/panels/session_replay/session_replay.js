var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/session_replay/SessionReplayPanel.js
var SessionReplayPanel_exports = {};
__export(SessionReplayPanel_exports, {
  SessionReplayPanel: () => SessionReplayPanel
});
import * as UI from "./../../ui/legacy/legacy.js";
import * as SDK from "./../../core/sdk/sdk.js";
import { Replayer, cssStyles } from "./../../third_party/rrweb-replay/rrweb-replay.js";
var sessionReplayPanelInstance;
var SessionReplayPanel = class _SessionReplayPanel extends UI.Panel.Panel {
  #rrwebEvents = [];
  #container = null;
  #target = null;
  #observer = null;
  #replayer = null;
  // Replayer instance / Replayer 인스턴스
  #rrwebLoaded = false;
  // Flag to track if rrweb is loaded / rrweb 로드 여부 플래그
  #controlsContainer = null;
  // Controls container / 컨트롤 컨테이너 (for future use / 향후 사용)
  #playPauseButton = null;
  // Play/pause button / 재생/일시정지 버튼
  #progressBar = null;
  // Progress bar / 진행 바
  #progressFill = null;
  // Progress fill / 진행 채우기
  #timeDisplay = null;
  // Time display / 시간 표시
  #isPlaying = false;
  // Playing state / 재생 상태
  #currentTime = 0;
  // Current time in ms / 현재 시간 (ms)
  #totalTime = 0;
  // Total time in ms / 총 시간 (ms)
  #updateInterval = null;
  // Update interval ID / 업데이트 간격 ID
  constructor() {
    super("session-replay");
    this.render();
  }
  wasShown() {
    super.wasShown();
    if (window !== window.top) {
      window.parent.postMessage({ type: "SESSION_REPLAY_READY" }, "*");
    } else if (window.opener) {
      window.opener.postMessage({ type: "SESSION_REPLAY_READY" }, "*");
    }
    this.#currentTime = 0;
    this.updateContainerHeight();
    this.updateProgress();
    this.setupCDPListener();
    setTimeout(() => {
      if (!this.#target) {
        this.setupCDPListener();
      }
      this.updateContainerHeight();
    }, 1e3);
  }
  setupCDPListener() {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      SDK.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged", () => {
        const newTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (newTarget && !this.#target) {
          this.#target = newTarget;
          this.attachToTarget(newTarget);
        }
      }, this);
      return;
    }
    this.#target = target;
    this.attachToTarget(target);
  }
  attachToTarget(target) {
    const router = target.router();
    if (!router) {
      return;
    }
    const connection = router.connection;
    if (!connection) {
      return;
    }
    const sessionReplayAgent = target.sessionReplayAgent();
    if (sessionReplayAgent) {
      sessionReplayAgent.invoke_enable().then(() => {
      }).catch((_error) => {
      });
    }
    this.#observer = {
      onEvent: (event) => {
        if (event.method === "SessionReplay.eventRecorded") {
          const params = event.params;
          if (Array.isArray(params.events)) {
            this.#rrwebEvents.push(...params.events);
            void this.updateReplay();
          }
        }
      },
      onDisconnect: (_reason) => {
        this.#observer = null;
      }
    };
    connection.observe(this.#observer);
  }
  render() {
    this.injectRrwebStyles();
    const container = document.createElement("div");
    container.className = "session-replay-panel";
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "session-replay-content";
    this.#container = contentWrapper;
    container.appendChild(contentWrapper);
    this.createControls(container);
    this.contentElement.appendChild(container);
    this.updateContainerHeight();
    void this.updateReplay();
  }
  updateContainerHeight() {
    if (!this.#container) {
      return;
    }
    const updateHeight = () => {
      if (!this.#container) {
        return;
      }
      const panelElement = this.contentElement;
      const panelRect = panelElement.getBoundingClientRect();
      const controlsHeight = this.#controlsContainer?.offsetHeight || 0;
      const availableHeight = panelRect.height - controlsHeight;
      this.#container.style.height = `${Math.max(0, availableHeight)}px`;
      this.#container.style.minHeight = `${Math.max(0, availableHeight)}px`;
    };
    updateHeight();
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });
    resizeObserver.observe(this.contentElement);
    window.addEventListener("resize", updateHeight);
  }
  createControls(container) {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "session-replay-controls";
    this.#controlsContainer = controlsContainer;
    const playPauseButton = document.createElement("button");
    playPauseButton.className = "session-replay-play-pause";
    playPauseButton.setAttribute("aria-label", "Play / \uC7AC\uC0DD");
    playPauseButton.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
    playPauseButton.addEventListener("click", () => this.togglePlayPause());
    this.#playPauseButton = playPauseButton;
    controlsContainer.appendChild(playPauseButton);
    const progressContainer = document.createElement("div");
    progressContainer.className = "session-replay-progress-container";
    progressContainer.addEventListener("click", (e) => this.handleProgressClick(e));
    const progressFill = document.createElement("div");
    progressFill.className = "session-replay-progress-fill";
    progressContainer.appendChild(progressFill);
    this.#progressBar = progressContainer;
    this.#progressFill = progressFill;
    controlsContainer.appendChild(progressContainer);
    const timeDisplay = document.createElement("div");
    timeDisplay.className = "session-replay-time";
    timeDisplay.textContent = "0:00 / 0:00";
    this.#timeDisplay = timeDisplay;
    controlsContainer.appendChild(timeDisplay);
    container.appendChild(controlsContainer);
  }
  togglePlayPause() {
    if (!this.#replayer) {
      return;
    }
    if (this.#isPlaying) {
      this.#replayer.pause();
    } else {
      if (this.#currentTime >= this.#totalTime) {
        this.#currentTime = 0;
        this.updateProgress();
      }
      this.#replayer.play(this.#currentTime);
    }
  }
  updatePlayPauseButton(isPlaying) {
    if (!this.#playPauseButton) {
      return;
    }
    if (isPlaying) {
      this.#playPauseButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      `;
      this.#playPauseButton.setAttribute("aria-label", "Pause / \uC77C\uC2DC\uC815\uC9C0");
    } else {
      this.#playPauseButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
      this.#playPauseButton.setAttribute("aria-label", "Play / \uC7AC\uC0DD");
    }
  }
  handleProgressClick(e) {
    if (!this.#progressBar || !this.#replayer || this.#totalTime === 0) {
      return;
    }
    const rect = this.#progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = this.#totalTime * percentage;
    this.#currentTime = targetTime;
    this.updateProgress();
    if (this.#isPlaying) {
      this.#replayer.pause();
      this.#replayer.play(targetTime);
    } else {
      this.#replayer.pause(targetTime);
    }
  }
  startProgressUpdate() {
    this.stopProgressUpdate();
    this.#updateInterval = window.setInterval(() => {
      if (this.#replayer && this.#isPlaying) {
        try {
          const replayer = this.#replayer;
          if (replayer.getCurrentTime) {
            this.#currentTime = replayer.getCurrentTime();
          } else {
            this.#currentTime = Math.min(this.#totalTime, this.#currentTime + 100);
          }
        } catch (_error) {
        }
        this.updateProgress();
      }
    }, 100);
  }
  stopProgressUpdate() {
    if (this.#updateInterval !== null) {
      clearInterval(this.#updateInterval);
      this.#updateInterval = null;
    }
  }
  updateProgress() {
    if (!this.#progressFill || !this.#timeDisplay || this.#totalTime === 0) {
      return;
    }
    this.#currentTime = Math.max(0, Math.min(this.#totalTime, this.#currentTime));
    const percentage = Math.min(100, this.#currentTime / this.#totalTime * 100);
    this.#progressFill.style.width = `${percentage}%`;
    const currentTimeStr = this.formatTime(this.#currentTime);
    const totalTimeStr = this.formatTime(this.#totalTime);
    this.#timeDisplay.textContent = `${currentTimeStr} / ${totalTimeStr}`;
  }
  formatTime(ms) {
    const clampedMs = Math.max(0, ms);
    const seconds = Math.floor(clampedMs / 1e3);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  calculateTotalTime() {
    if (this.#rrwebEvents.length === 0) {
      return 0;
    }
    let maxTime = 0;
    for (const event of this.#rrwebEvents) {
      const evt = event;
      if (evt.timestamp) {
        maxTime = Math.max(maxTime, evt.timestamp);
      }
    }
    const firstEvent = this.#rrwebEvents[0];
    if (firstEvent?.timestamp) {
      return maxTime - firstEvent.timestamp;
    }
    return 0;
  }
  injectRrwebStyles() {
    if (document.getElementById("rrweb-replay-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "rrweb-replay-styles";
    style.textContent = cssStyles;
    document.head.appendChild(style);
  }
  async updateReplay() {
    if (!this.#container) {
      return;
    }
    const hasFullSnapshot = this.#rrwebEvents.some((event) => event.type === 2);
    if (this.#rrwebEvents.length < 2 || !hasFullSnapshot) {
      this.#container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
          Waiting for full snapshot... (${this.#rrwebEvents.length} events)
        </div>
      `;
      return;
    }
    if (!this.#rrwebLoaded) {
      try {
        this.#rrwebLoaded = true;
        this.#container.innerHTML = "";
        const wrapper = document.createElement("div");
        this.#container.appendChild(wrapper);
        this.#totalTime = this.calculateTotalTime();
        this.#currentTime = 0;
        let viewportWidth = 1920;
        let viewportHeight = 1080;
        for (const event of this.#rrwebEvents) {
          const evt = event;
          if (evt.type === 4 && evt.data?.width && evt.data?.height) {
            viewportWidth = evt.data.width;
            viewportHeight = evt.data.height;
            break;
          }
        }
        this.#replayer = new Replayer(this.#rrwebEvents, {
          root: wrapper,
          speed: 1,
          skipInactive: false,
          showWarning: false
        });
        setTimeout(() => {
          if (this.#replayer) {
            const replayer = this.#replayer;
            if (replayer.iframe) {
              replayer.iframe.setAttribute("width", String(viewportWidth));
              replayer.iframe.setAttribute("height", String(viewportHeight));
              replayer.iframe.style.display = "inherit";
            }
          }
        }, 100);
        this.setupReplayerEvents();
        this.updateProgress();
        this.updatePlayPauseButton(false);
      } catch (error) {
        this.#container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f00;">
            Failed to load replay: ${error instanceof Error ? error.message : String(error)}
          </div>
        `;
        this.#rrwebLoaded = false;
      }
    } else if (this.#replayer) {
      this.stopProgressUpdate();
      this.#replayer.pause();
      this.#replayer = null;
      this.#rrwebLoaded = false;
      await this.updateReplay();
    }
  }
  setupReplayerEvents() {
    if (!this.#replayer) {
      return;
    }
    try {
      const replayer = this.#replayer;
      if (replayer.emitter?.on) {
        replayer.emitter.on("start", () => {
          this.#isPlaying = true;
          this.updatePlayPauseButton(true);
          this.startProgressUpdate();
        });
        replayer.emitter.on("pause", () => {
          this.#isPlaying = false;
          this.updatePlayPauseButton(false);
          this.stopProgressUpdate();
          if (replayer.getCurrentTime) {
            this.#currentTime = replayer.getCurrentTime();
            this.updateProgress();
          }
        });
        replayer.emitter.on("finish", () => {
          this.#isPlaying = false;
          this.#currentTime = this.#totalTime;
          this.updatePlayPauseButton(false);
          this.stopProgressUpdate();
          this.updateProgress();
        });
      }
    } catch (_error) {
    }
  }
  willHide() {
    super.willHide();
    if (window !== window.top) {
      window.parent.postMessage({ type: "SESSION_REPLAY_HIDDEN" }, "*");
    } else if (window.opener) {
      window.opener.postMessage({ type: "SESSION_REPLAY_HIDDEN" }, "*");
    }
    this.stopProgressUpdate();
    if (this.#replayer) {
      this.#replayer.pause();
      this.#isPlaying = false;
    }
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!sessionReplayPanelInstance || forceNew) {
      sessionReplayPanelInstance = new _SessionReplayPanel();
    }
    return sessionReplayPanelInstance;
  }
};
export {
  SessionReplayPanel_exports as SessionReplayPanel
};
//# sourceMappingURL=session_replay.js.map
