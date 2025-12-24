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
import * as UI from "./..\\..\\ui\\legacy\\legacy.js";
import * as SDK from "./..\\..\\core\\sdk\\sdk.js";
import { Replayer, cssStyles } from "./..\\..\\third_party\\rrweb-replay\\rrweb-replay.js";
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
    console.log("SessionReplay: Panel constructor called / \uD328\uB110 \uC0DD\uC131\uC790 \uD638\uCD9C\uB428");
    this.render();
  }
  wasShown() {
    super.wasShown();
    console.log("SessionReplay: Panel was shown / \uD328\uB110 \uD45C\uC2DC\uB428");
    this.updateContainerHeight();
    this.setupCDPListener();
    setTimeout(() => {
      if (!this.#target) {
        console.log("SessionReplay: Retrying setup after delay / \uC9C0\uC5F0 \uD6C4 \uC7AC\uC2DC\uB3C4");
        this.setupCDPListener();
      }
      this.updateContainerHeight();
    }, 1e3);
  }
  setupCDPListener() {
    console.log("SessionReplay: setupCDPListener called / setupCDPListener \uD638\uCD9C\uB428");
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    console.log("SessionReplay: Primary target / \uC8FC\uC694 \uD0C0\uAC9F:", target);
    if (!target) {
      console.log("SessionReplay: No target available, waiting... / \uD0C0\uAC9F \uC5C6\uC74C, \uB300\uAE30 \uC911...");
      SDK.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged", () => {
        console.log("SessionReplay: AVAILABLE_TARGETS_CHANGED event / \uD0C0\uAC9F \uBCC0\uACBD \uC774\uBCA4\uD2B8");
        const newTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (newTarget && !this.#target) {
          console.log("SessionReplay: New target available / \uC0C8 \uD0C0\uAC9F \uC0AC\uC6A9 \uAC00\uB2A5:", newTarget);
          this.#target = newTarget;
          this.attachToTarget(newTarget);
        }
      }, this);
      return;
    }
    console.log("SessionReplay: Target available, attaching... / \uD0C0\uAC9F \uC0AC\uC6A9 \uAC00\uB2A5, \uC5F0\uACB0 \uC911...");
    this.#target = target;
    this.attachToTarget(target);
  }
  attachToTarget(target) {
    const router = target.router();
    if (!router) {
      console.warn("SessionReplay: Router not available / \uB77C\uC6B0\uD130\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC74C");
      return;
    }
    const connection = router.connection;
    if (!connection) {
      console.warn("SessionReplay: Connection not available / \uC5F0\uACB0\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC74C");
      return;
    }
    console.log("SessionReplay: Attaching to target / \uD0C0\uAC9F\uC5D0 \uC5F0\uACB0 \uC911...", target);
    const sessionReplayAgent = target.sessionReplayAgent();
    if (sessionReplayAgent) {
      sessionReplayAgent.invoke_enable().then(() => {
        console.log("SessionReplay: Domain enabled / \uB3C4\uBA54\uC778 \uD65C\uC131\uD654\uB428");
      }).catch((error) => {
        console.error("SessionReplay: Failed to enable domain / \uB3C4\uBA54\uC778 \uD65C\uC131\uD654 \uC2E4\uD328:", error);
      });
    } else {
      console.warn("SessionReplay: SessionReplayAgent not available / SessionReplayAgent\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC74C");
    }
    this.#observer = {
      onEvent: (event) => {
        if (this.#rrwebEvents.length < 5) {
          console.log("SessionReplay: CDP event received / CDP \uC774\uBCA4\uD2B8 \uC218\uC2E0:", event.method, event.params);
        }
        if (event.method?.includes("SessionReplay") || event.method?.toLowerCase().includes("session")) {
          console.log("SessionReplay: Received SessionReplay event / SessionReplay \uC774\uBCA4\uD2B8 \uC218\uC2E0:", event.method, event.params);
        }
        if (event.method === "SessionReplay.eventRecorded") {
          const params = event.params;
          console.log("SessionReplay: eventRecorded event received / eventRecorded \uC774\uBCA4\uD2B8 \uC218\uC2E0:", params);
          if (Array.isArray(params.events)) {
            console.log("SessionReplay: Received events / \uC774\uBCA4\uD2B8 \uC218\uC2E0:", params.events.length);
            this.#rrwebEvents.push(...params.events);
            console.log("SessionReplay: Total events / \uCD1D \uC774\uBCA4\uD2B8:", this.#rrwebEvents.length);
            void this.updateReplay();
          } else {
            console.warn("SessionReplay: params.events is not an array / params.events\uAC00 \uBC30\uC5F4\uC774 \uC544\uB2D8:", params);
          }
        }
      },
      onDisconnect: (_reason) => {
        console.log("SessionReplay: Connection disconnected / \uC5F0\uACB0 \uB04A\uAE40:", _reason);
        this.#observer = null;
      }
    };
    connection.observe(this.#observer);
    console.log("SessionReplay: Observer attached / \uC635\uC800\uBC84 \uC5F0\uACB0\uB428");
    console.log("SessionReplay: Connection state / \uC5F0\uACB0 \uC0C1\uD0DC:", {
      hasObserver: !!this.#observer,
      connectionReady: !!connection,
      targetId: target.id()
    });
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
        } catch (error) {
          console.warn("SessionReplay: Failed to get current time / \uD604\uC7AC \uC2DC\uAC04 \uAC00\uC838\uC624\uAE30 \uC2E4\uD328:", error);
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
    const percentage = Math.min(100, this.#currentTime / this.#totalTime * 100);
    this.#progressFill.style.width = `${percentage}%`;
    const currentTimeStr = this.formatTime(this.#currentTime);
    const totalTimeStr = this.formatTime(this.#totalTime);
    this.#timeDisplay.textContent = `${currentTimeStr} / ${totalTimeStr}`;
  }
  formatTime(ms) {
    const seconds = Math.floor(ms / 1e3);
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
      console.warn("SessionReplay: Container not available / \uCEE8\uD14C\uC774\uB108\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC74C");
      return;
    }
    const hasFullSnapshot = this.#rrwebEvents.some((event) => event.type === 2);
    console.log("SessionReplay: updateReplay called / updateReplay \uD638\uCD9C\uB428", {
      eventCount: this.#rrwebEvents.length,
      hasFullSnapshot,
      rrwebLoaded: this.#rrwebLoaded
    });
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
        console.log("SessionReplay: Initializing Replayer / Replayer \uCD08\uAE30\uD654 \uC911...");
        console.log("SessionReplay: Replayer class / Replayer \uD074\uB798\uC2A4:", Replayer);
        this.#rrwebLoaded = true;
        this.#container.innerHTML = "";
        const wrapper = document.createElement("div");
        this.#container.appendChild(wrapper);
        console.log("SessionReplay: Creating Replayer with events / \uC774\uBCA4\uD2B8\uB85C Replayer \uC0DD\uC131:", this.#rrwebEvents.length);
        this.#totalTime = this.calculateTotalTime();
        this.#currentTime = 0;
        let viewportWidth = 1920;
        let viewportHeight = 1080;
        for (const event of this.#rrwebEvents) {
          const evt = event;
          if (evt.type === 4 && evt.data?.width && evt.data?.height) {
            viewportWidth = evt.data.width;
            viewportHeight = evt.data.height;
            console.log("SessionReplay: Found viewport size from Meta event / Meta \uC774\uBCA4\uD2B8\uC5D0\uC11C \uBDF0\uD3EC\uD2B8 \uD06C\uAE30 \uBC1C\uACAC:", {
              width: viewportWidth,
              height: viewportHeight
            });
            break;
          }
        }
        this.#replayer = new Replayer(this.#rrwebEvents, {
          root: wrapper,
          speed: 1,
          skipInactive: false,
          showWarning: false
        });
        console.log("SessionReplay: Replayer created / Replayer \uC0DD\uC131\uB428", {
          totalTime: this.#totalTime,
          eventCount: this.#rrwebEvents.length
        });
        setTimeout(() => {
          if (this.#replayer) {
            const replayer = this.#replayer;
            if (replayer.iframe) {
              replayer.iframe.setAttribute("width", String(viewportWidth));
              replayer.iframe.setAttribute("height", String(viewportHeight));
              replayer.iframe.style.display = "inherit";
              console.log("SessionReplay: Set iframe size / iframe \uD06C\uAE30 \uC124\uC815:", {
                width: viewportWidth,
                height: viewportHeight
              });
            }
          }
        }, 100);
        this.setupReplayerEvents();
        this.updateProgress();
        this.updatePlayPauseButton(false);
      } catch (error) {
        console.error("Failed to initialize rrweb replayer / rrweb replayer \uCD08\uAE30\uD654 \uC2E4\uD328:", error);
        console.error("Error details / \uC624\uB958 \uC0C1\uC138:", {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : void 0,
          ReplayerAvailable: typeof Replayer !== "undefined"
        });
        this.#container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f00;">
            Failed to load replay: ${error instanceof Error ? error.message : String(error)}
          </div>
        `;
        this.#rrwebLoaded = false;
      }
    } else if (this.#replayer) {
      console.log("SessionReplay: Recreating replayer with new events / \uC0C8 \uC774\uBCA4\uD2B8\uB85C replayer \uC7AC\uC0DD\uC131");
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
          console.log("SessionReplay: Replayer started / Replayer \uC2DC\uC791\uB428");
          this.#isPlaying = true;
          this.updatePlayPauseButton(true);
          this.startProgressUpdate();
        });
        replayer.emitter.on("pause", () => {
          console.log("SessionReplay: Replayer paused / Replayer \uC77C\uC2DC\uC815\uC9C0\uB428");
          this.#isPlaying = false;
          this.updatePlayPauseButton(false);
          this.stopProgressUpdate();
          if (replayer.getCurrentTime) {
            this.#currentTime = replayer.getCurrentTime();
            this.updateProgress();
          }
        });
        replayer.emitter.on("finish", () => {
          console.log("SessionReplay: Replayer finished / Replayer \uC885\uB8CC\uB428");
          this.#isPlaying = false;
          this.#currentTime = this.#totalTime;
          this.updatePlayPauseButton(false);
          this.stopProgressUpdate();
          this.updateProgress();
        });
      } else {
        console.warn("SessionReplay: Emitter not available / Emitter\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC74C");
      }
    } catch (error) {
      console.warn("SessionReplay: Could not setup replayer events / replayer \uC774\uBCA4\uD2B8 \uC124\uC815 \uC2E4\uD328:", error);
    }
  }
  willHide() {
    super.willHide();
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
