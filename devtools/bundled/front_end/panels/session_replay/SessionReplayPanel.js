// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import { Replayer, cssStyles } from '../../third_party/rrweb-replay/rrweb-replay.js';
let sessionReplayPanelInstance;
export class SessionReplayPanel extends UI.Panel.Panel {
    #rrwebEvents = [];
    #container = null;
    #target = null;
    #observer = null;
    #replayer = null; // Replayer instance / Replayer 인스턴스
    #rrwebLoaded = false; // Flag to track if rrweb is loaded / rrweb 로드 여부 플래그
    #controlsContainer = null; // Controls container / 컨트롤 컨테이너 (for future use / 향후 사용)
    #playPauseButton = null; // Play/pause button / 재생/일시정지 버튼
    #progressBar = null; // Progress bar / 진행 바
    #progressFill = null; // Progress fill / 진행 채우기
    #timeDisplay = null; // Time display / 시간 표시
    #isPlaying = false; // Playing state / 재생 상태
    #currentTime = 0; // Current time in ms / 현재 시간 (ms)
    #totalTime = 0; // Total time in ms / 총 시간 (ms)
    #updateInterval = null; // Update interval ID / 업데이트 간격 ID
    constructor() {
        super('session-replay');
        console.log('SessionReplay: Panel constructor called / 패널 생성자 호출됨');
        this.render();
    }
    wasShown() {
        super.wasShown();
        console.log('SessionReplay: Panel was shown / 패널 표시됨');
        // Update container height when panel is shown / 패널이 표시될 때 컨테이너 높이 업데이트
        this.updateContainerHeight();
        // Setup CDP listener when panel is shown / 패널이 표시될 때 CDP 리스너 설정
        this.setupCDPListener();
        // Also try to setup listener after a short delay in case target becomes available / 타겟이 나중에 사용 가능해질 수 있으므로 짧은 지연 후에도 시도
        setTimeout(() => {
            if (!this.#target) {
                console.log('SessionReplay: Retrying setup after delay / 지연 후 재시도');
                this.setupCDPListener();
            }
            // Update height again after delay to ensure correct calculation / 지연 후 높이를 다시 업데이트하여 정확한 계산 보장
            this.updateContainerHeight();
        }, 1000);
    }
    setupCDPListener() {
        console.log('SessionReplay: setupCDPListener called / setupCDPListener 호출됨');
        // Get primary target and listen to CDP events / 주요 타겟을 가져와서 CDP 이벤트 리스닝
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        console.log('SessionReplay: Primary target / 주요 타겟:', target);
        if (!target) {
            console.log('SessionReplay: No target available, waiting... / 타겟 없음, 대기 중...');
            // Wait for target to be available / 타겟이 사용 가능할 때까지 대기
            SDK.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged" /* SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED */, () => {
                console.log('SessionReplay: AVAILABLE_TARGETS_CHANGED event / 타겟 변경 이벤트');
                const newTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
                if (newTarget && !this.#target) {
                    console.log('SessionReplay: New target available / 새 타겟 사용 가능:', newTarget);
                    this.#target = newTarget;
                    this.attachToTarget(newTarget);
                }
            }, this);
            return;
        }
        console.log('SessionReplay: Target available, attaching... / 타겟 사용 가능, 연결 중...');
        this.#target = target;
        this.attachToTarget(target);
    }
    attachToTarget(target) {
        // Listen to SessionReplay.eventRecorded events / SessionReplay.eventRecorded 이벤트 리스닝
        const router = target.router();
        if (!router) {
            console.warn('SessionReplay: Router not available / 라우터를 사용할 수 없음');
            return;
        }
        const connection = router.connection;
        if (!connection) {
            console.warn('SessionReplay: Connection not available / 연결을 사용할 수 없음');
            return;
        }
        console.log('SessionReplay: Attaching to target / 타겟에 연결 중...', target);
        // Enable SessionReplay domain / SessionReplay 도메인 활성화
        const sessionReplayAgent = target.sessionReplayAgent();
        if (sessionReplayAgent) {
            sessionReplayAgent.invoke_enable().then(() => {
                console.log('SessionReplay: Domain enabled / 도메인 활성화됨');
            }).catch((error) => {
                console.error('SessionReplay: Failed to enable domain / 도메인 활성화 실패:', error);
            });
        }
        else {
            console.warn('SessionReplay: SessionReplayAgent not available / SessionReplayAgent를 사용할 수 없음');
        }
        this.#observer = {
            onEvent: (event) => {
                // Log first few events for debugging / 디버깅을 위해 처음 몇 개 이벤트 로깅
                if (this.#rrwebEvents.length < 5) {
                    console.log('SessionReplay: CDP event received / CDP 이벤트 수신:', event.method, event.params);
                }
                // Log all SessionReplay related events for debugging / 디버깅을 위해 모든 SessionReplay 관련 이벤트 로깅
                if (event.method?.includes('SessionReplay') || event.method?.toLowerCase().includes('session')) {
                    console.log('SessionReplay: Received SessionReplay event / SessionReplay 이벤트 수신:', event.method, event.params);
                }
                // Check for SessionReplay.eventRecorded event / SessionReplay.eventRecorded 이벤트 확인
                if (event.method === 'SessionReplay.eventRecorded') {
                    const params = event.params;
                    console.log('SessionReplay: eventRecorded event received / eventRecorded 이벤트 수신:', params);
                    if (Array.isArray(params.events)) {
                        console.log('SessionReplay: Received events / 이벤트 수신:', params.events.length);
                        this.#rrwebEvents.push(...params.events);
                        console.log('SessionReplay: Total events / 총 이벤트:', this.#rrwebEvents.length);
                        void this.updateReplay();
                    }
                    else {
                        console.warn('SessionReplay: params.events is not an array / params.events가 배열이 아님:', params);
                    }
                }
            },
            onDisconnect: (_reason) => {
                console.log('SessionReplay: Connection disconnected / 연결 끊김:', _reason);
                this.#observer = null;
            },
        };
        connection.observe(this.#observer);
        console.log('SessionReplay: Observer attached / 옵저버 연결됨');
        console.log('SessionReplay: Connection state / 연결 상태:', {
            hasObserver: !!this.#observer,
            connectionReady: !!connection,
            targetId: target.id(),
        });
    }
    render() {
        // Inject rrweb-replay CSS styles / rrweb-replay CSS 스타일 주입
        this.injectRrwebStyles();
        const container = document.createElement('div');
        container.className = 'session-replay-panel';
        // Create content wrapper / 콘텐츠 래퍼 생성
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'session-replay-content';
        this.#container = contentWrapper;
        container.appendChild(contentWrapper);
        // Create controls / 컨트롤 생성
        this.createControls(container);
        this.contentElement.appendChild(container);
        // Update container height after layout / 레이아웃 후 컨테이너 높이 업데이트
        this.updateContainerHeight();
        void this.updateReplay();
    }
    updateContainerHeight() {
        // Calculate available height considering tab bar and controls / 탭바와 컨트롤을 고려한 사용 가능한 높이 계산
        if (!this.#container) {
            return;
        }
        const updateHeight = () => {
            if (!this.#container) {
                return;
            }
            // Get panel content element dimensions / 패널 콘텐츠 요소 크기 가져오기
            const panelElement = this.contentElement;
            const panelRect = panelElement.getBoundingClientRect();
            // Get controls height if available / 컨트롤 높이 가져오기 (있는 경우)
            const controlsHeight = this.#controlsContainer?.offsetHeight || 0;
            // Calculate available height / 사용 가능한 높이 계산
            const availableHeight = panelRect.height - controlsHeight;
            // Set content wrapper height / 콘텐츠 래퍼 높이 설정
            this.#container.style.height = `${Math.max(0, availableHeight)}px`;
            this.#container.style.minHeight = `${Math.max(0, availableHeight)}px`;
        };
        // Update immediately / 즉시 업데이트
        updateHeight();
        // Update on resize / 리사이즈 시 업데이트
        const resizeObserver = new ResizeObserver(() => {
            updateHeight();
        });
        resizeObserver.observe(this.contentElement);
        // Also listen to window resize / 윈도우 리사이즈도 리스닝
        window.addEventListener('resize', updateHeight);
    }
    createControls(container) {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'session-replay-controls';
        this.#controlsContainer = controlsContainer;
        // Play/Pause button / 재생/일시정지 버튼
        const playPauseButton = document.createElement('button');
        playPauseButton.className = 'session-replay-play-pause';
        playPauseButton.setAttribute('aria-label', 'Play / 재생');
        playPauseButton.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
        playPauseButton.addEventListener('click', () => this.togglePlayPause());
        this.#playPauseButton = playPauseButton;
        controlsContainer.appendChild(playPauseButton);
        // Progress bar / 진행 바
        const progressContainer = document.createElement('div');
        progressContainer.className = 'session-replay-progress-container';
        progressContainer.addEventListener('click', (e) => this.handleProgressClick(e));
        const progressFill = document.createElement('div');
        progressFill.className = 'session-replay-progress-fill';
        progressContainer.appendChild(progressFill);
        this.#progressBar = progressContainer;
        this.#progressFill = progressFill;
        controlsContainer.appendChild(progressContainer);
        // Time display / 시간 표시
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'session-replay-time';
        timeDisplay.textContent = '0:00 / 0:00';
        this.#timeDisplay = timeDisplay;
        controlsContainer.appendChild(timeDisplay);
        container.appendChild(controlsContainer);
    }
    togglePlayPause() {
        if (!this.#replayer) {
            return;
        }
        if (this.#isPlaying) {
            // Pause playback / 재생 일시정지
            this.#replayer.pause();
            // Note: The pause event from emitter will update the state / 참고: emitter의 pause 이벤트가 상태를 업데이트함
        }
        else {
            // Resume or start playback / 재생 재개 또는 시작
            // If at the end, restart from beginning / 끝에 있으면 처음부터 재시작
            if (this.#currentTime >= this.#totalTime) {
                this.#currentTime = 0;
                this.updateProgress();
            }
            this.#replayer.play(this.#currentTime);
            // Note: The start event from emitter will update the state / 참고: emitter의 start 이벤트가 상태를 업데이트함
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
            this.#playPauseButton.setAttribute('aria-label', 'Pause / 일시정지');
        }
        else {
            this.#playPauseButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
            this.#playPauseButton.setAttribute('aria-label', 'Play / 재생');
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
        // Update current time immediately / 현재 시간 즉시 업데이트
        this.#currentTime = targetTime;
        this.updateProgress();
        // Seek to target time / 목표 시간으로 이동
        if (this.#isPlaying) {
            // If playing, pause first then play at new position / 재생 중이면 먼저 일시정지한 후 새 위치에서 재생
            this.#replayer.pause();
            this.#replayer.play(targetTime);
        }
        else {
            // If paused, just seek without playing / 일시정지 중이면 재생하지 않고 이동만
            this.#replayer.pause(targetTime);
        }
    }
    startProgressUpdate() {
        this.stopProgressUpdate();
        this.#updateInterval = window.setInterval(() => {
            if (this.#replayer && this.#isPlaying) {
                // Get current time from replayer / replayer에서 현재 시간 가져오기
                try {
                    const replayer = this.#replayer;
                    if (replayer.getCurrentTime) {
                        this.#currentTime = replayer.getCurrentTime();
                    }
                    else {
                        // Fallback: estimate based on elapsed time / 대체: 경과 시간 기반 추정
                        this.#currentTime = Math.min(this.#totalTime, this.#currentTime + 100);
                    }
                }
                catch (error) {
                    console.warn('SessionReplay: Failed to get current time / 현재 시간 가져오기 실패:', error);
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
        const percentage = Math.min(100, (this.#currentTime / this.#totalTime) * 100);
        this.#progressFill.style.width = `${percentage}%`;
        const currentTimeStr = this.formatTime(this.#currentTime);
        const totalTimeStr = this.formatTime(this.#totalTime);
        this.#timeDisplay.textContent = `${currentTimeStr} / ${totalTimeStr}`;
    }
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    calculateTotalTime() {
        if (this.#rrwebEvents.length === 0) {
            return 0;
        }
        // Find the last event's timestamp / 마지막 이벤트의 타임스탬프 찾기
        let maxTime = 0;
        for (const event of this.#rrwebEvents) {
            const evt = event;
            if (evt.timestamp) {
                maxTime = Math.max(maxTime, evt.timestamp);
            }
        }
        // Calculate relative time from first event / 첫 이벤트로부터의 상대 시간 계산
        const firstEvent = this.#rrwebEvents[0];
        if (firstEvent?.timestamp) {
            return maxTime - firstEvent.timestamp;
        }
        return 0;
    }
    injectRrwebStyles() {
        // Check if styles are already injected / 스타일이 이미 주입되었는지 확인
        if (document.getElementById('rrweb-replay-styles')) {
            return;
        }
        // Inject CSS from rrweb-replay package / rrweb-replay 패키지에서 CSS 주입
        const style = document.createElement('style');
        style.id = 'rrweb-replay-styles';
        style.textContent = cssStyles;
        document.head.appendChild(style);
    }
    async updateReplay() {
        if (!this.#container) {
            console.warn('SessionReplay: Container not available / 컨테이너를 사용할 수 없음');
            return;
        }
        // Check if we have enough events for replay / 재생에 충분한 이벤트가 있는지 확인
        const hasFullSnapshot = this.#rrwebEvents.some((event) => event.type === 2);
        console.log('SessionReplay: updateReplay called / updateReplay 호출됨', {
            eventCount: this.#rrwebEvents.length,
            hasFullSnapshot,
            rrwebLoaded: this.#rrwebLoaded,
        });
        if (this.#rrwebEvents.length < 2 || !hasFullSnapshot) {
            this.#container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
          Waiting for full snapshot... (${this.#rrwebEvents.length} events)
        </div>
      `;
            return;
        }
        // Initialize rrweb Replayer / rrweb Replayer 초기화
        if (!this.#rrwebLoaded) {
            try {
                console.log('SessionReplay: Initializing Replayer / Replayer 초기화 중...');
                console.log('SessionReplay: Replayer class / Replayer 클래스:', Replayer);
                this.#rrwebLoaded = true;
                // Clear container and create wrapper / 컨테이너 비우고 wrapper 생성
                // Follow original rrweb pattern: wrapper has no size constraints, iframe gets fixed size / 원본 rrweb 패턴 따름: wrapper는 크기 제한 없음, iframe은 고정 크기
                this.#container.innerHTML = '';
                const wrapper = document.createElement('div');
                // Wrapper uses default styles from CSS (position: relative only) / Wrapper는 CSS의 기본 스타일 사용 (position: relative만)
                this.#container.appendChild(wrapper);
                console.log('SessionReplay: Creating Replayer with events / 이벤트로 Replayer 생성:', this.#rrwebEvents.length);
                // Calculate total time / 총 시간 계산
                this.#totalTime = this.calculateTotalTime();
                this.#currentTime = 0;
                // Get viewport size from first event / 첫 이벤트에서 뷰포트 크기 가져오기
                let viewportWidth = 1920; // Default width / 기본 너비
                let viewportHeight = 1080; // Default height / 기본 높이
                // Try to get viewport size from Meta event / Meta 이벤트에서 뷰포트 크기 가져오기 시도
                for (const event of this.#rrwebEvents) {
                    const evt = event;
                    // Meta event (type 4) contains viewport size / Meta 이벤트(type 4)에 뷰포트 크기가 포함됨
                    if (evt.type === 4 && evt.data?.width && evt.data?.height) {
                        viewportWidth = evt.data.width;
                        viewportHeight = evt.data.height;
                        console.log('SessionReplay: Found viewport size from Meta event / Meta 이벤트에서 뷰포트 크기 발견:', {
                            width: viewportWidth,
                            height: viewportHeight,
                        });
                        break;
                    }
                }
                // Create Replayer instance with collected events / 수집된 이벤트로 Replayer 인스턴스 생성
                this.#replayer = new Replayer(this.#rrwebEvents, {
                    root: wrapper,
                    speed: 1,
                    skipInactive: false,
                    showWarning: false,
                });
                console.log('SessionReplay: Replayer created / Replayer 생성됨', {
                    totalTime: this.#totalTime,
                    eventCount: this.#rrwebEvents.length,
                });
                // Set fixed size for iframe after Replayer creates it / Replayer가 iframe을 생성한 후 고정 크기 설정
                // Follow original rrweb pattern: set iframe width/height attributes / 원본 rrweb 패턴 따름: iframe width/height 속성 설정
                setTimeout(() => {
                    if (this.#replayer) {
                        const replayer = this.#replayer;
                        if (replayer.iframe) {
                            replayer.iframe.setAttribute('width', String(viewportWidth));
                            replayer.iframe.setAttribute('height', String(viewportHeight));
                            replayer.iframe.style.display = 'inherit';
                            console.log('SessionReplay: Set iframe size / iframe 크기 설정:', {
                                width: viewportWidth,
                                height: viewportHeight,
                            });
                        }
                    }
                }, 100);
                // Setup event listeners / 이벤트 리스너 설정
                this.setupReplayerEvents();
                // Update UI / UI 업데이트
                this.updateProgress();
                this.updatePlayPauseButton(false);
                // Don't auto-play, let user control / 자동 재생하지 않고 사용자가 제어하도록
                // this.#replayer.play();
            }
            catch (error) {
                console.error('Failed to initialize rrweb replayer / rrweb replayer 초기화 실패:', error);
                console.error('Error details / 오류 상세:', {
                    error,
                    errorMessage: error instanceof Error ? error.message : String(error),
                    errorStack: error instanceof Error ? error.stack : undefined,
                    ReplayerAvailable: typeof Replayer !== 'undefined',
                });
                this.#container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f00;">
            Failed to load replay: ${error instanceof Error ? error.message : String(error)}
          </div>
        `;
                this.#rrwebLoaded = false;
            }
        }
        else if (this.#replayer) {
            // If new events arrive, we need to recreate the replayer / 새 이벤트가 도착하면 replayer를 재생성해야 함
            // rrweb Replayer doesn't support updating events after initialization
            // rrweb Replayer는 초기화 후 이벤트 업데이트를 지원하지 않음
            console.log('SessionReplay: Recreating replayer with new events / 새 이벤트로 replayer 재생성');
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
        // Listen to replayer events if available / 가능한 경우 replayer 이벤트 리스닝
        try {
            // Try to access emitter if available / 가능한 경우 emitter에 접근 시도
            const replayer = this.#replayer;
            if (replayer.emitter?.on) {
                // Listen to start event / start 이벤트 리스닝
                replayer.emitter.on('start', () => {
                    console.log('SessionReplay: Replayer started / Replayer 시작됨');
                    this.#isPlaying = true;
                    this.updatePlayPauseButton(true);
                    this.startProgressUpdate();
                });
                // Listen to pause event / pause 이벤트 리스닝
                replayer.emitter.on('pause', () => {
                    console.log('SessionReplay: Replayer paused / Replayer 일시정지됨');
                    this.#isPlaying = false;
                    this.updatePlayPauseButton(false);
                    this.stopProgressUpdate();
                    // Update current time when paused / 일시정지 시 현재 시간 업데이트
                    if (replayer.getCurrentTime) {
                        this.#currentTime = replayer.getCurrentTime();
                        this.updateProgress();
                    }
                });
                // Listen to finish event / finish 이벤트 리스닝
                replayer.emitter.on('finish', () => {
                    console.log('SessionReplay: Replayer finished / Replayer 종료됨');
                    this.#isPlaying = false;
                    this.#currentTime = this.#totalTime;
                    this.updatePlayPauseButton(false);
                    this.stopProgressUpdate();
                    this.updateProgress();
                });
            }
            else {
                console.warn('SessionReplay: Emitter not available / Emitter를 사용할 수 없음');
            }
        }
        catch (error) {
            console.warn('SessionReplay: Could not setup replayer events / replayer 이벤트 설정 실패:', error);
        }
    }
    willHide() {
        super.willHide();
        // Clean up when panel is hidden / 패널이 숨겨질 때 정리
        this.stopProgressUpdate();
        if (this.#replayer) {
            this.#replayer.pause();
            this.#isPlaying = false;
        }
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