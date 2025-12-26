import React, { useState, useEffect, useRef } from 'react';

/**
 * PostMessage CDP message format / PostMessage CDP 메시지 형식
 */
interface PostMessageCDPMessage {
  type: 'CDP_MESSAGE';
  message: string;
}

/**
 * CDP event file format / CDP 이벤트 파일 형식
 */
interface CDPEventFile {
  version: string;
  exportDate: string;
  clientId: string;
  events: PostMessageCDPMessage[];
  cookies?: Array<{ name: string; value: string; domain: string; path: string }>;
  localStorage?: Array<[string, string]>;
  sessionStorage?: Array<[string, string]>;
  domTree?: {
    documentURL: string;
    baseURL: string;
    html: string;
  };
}

/**
 * Get origin for embedded mode / embedded 모드를 위한 origin 가져오기
 */
function getHostOrigin(): string {
  let protocol = location.protocol;
  let host = location.host;
  if (protocol === 'about:' || protocol === 'blob:') {
    try {
      if (window.parent && window.parent !== window) {
        const parentLocation = window.parent.location;
        protocol = parentLocation.protocol;
        host = parentLocation.host;
      }
    } catch {
      // If accessing window.parent.location fails (e.g., cross-origin),
      // fall back to the current window's origin.
      // window.parent.location 접근 실패 시 (예: cross-origin),
      // 현재 창의 origin으로 폴백
    }
  }
  return `${protocol}//${host}`;
}

/**
 * Build DevTools popup URL / DevTools 팝업 URL 구성
 * Same as popup example / 팝업 예제와 동일
 */
function buildDevToolsUrl(): string {
  const baseUrl = new URL(
    '/chrome-remote-devtools/devtools-frontend/devtools_app.html',
    window.location.origin
  );
  const params = baseUrl.searchParams;

  // Use postMessage transport for popup mode / 팝업 모드에서는 postMessage transport 사용
  // No WebSocket URL needed / WebSocket URL 불필요
  params.append('postMessage', 'true');

  // DevTools configuration parameters / DevTools 설정 파라미터
  params.append('experiments', 'true');
  params.append('improvedChromeReloads', 'true');
  params.append('experimental', 'true');

  // Enable panels / 패널 활성화
  params.append('enableConsole', 'true');
  params.append('enableRuntime', 'true');
  params.append('enableNetwork', 'true');
  params.append('enableDebugger', 'true');

  // Embedded mode / embedded 모드
  const hostOrigin = getHostOrigin();
  baseUrl.hash = `?embedded=${encodeURIComponent(hostOrigin)}`;

  return baseUrl.toString();
}

/**
 * Build DevTools replay mode URL / DevTools replay 모드 URL 구성
 */
function buildDevToolsReplayUrl(): string {
  const baseUrl = new URL(
    '/chrome-remote-devtools/devtools-frontend/devtools_app.html',
    window.location.origin
  );
  const params = baseUrl.searchParams;

  // Replay mode / Replay 모드
  params.append('replay', 'true');
  // PostMessage mode is required for popup communication / 팝업 통신을 위해 PostMessage 모드 필요
  params.append('postMessage', 'true');
  // Disable embedded mode in replay to prevent receiving messages from original page / replay에서 embedded 모드 비활성화하여 원본 페이지의 메시지 수신 방지
  // No hash with embedded origin - this prevents the client from connecting / embedded origin이 있는 hash 없음 - 이것은 클라이언트가 연결하지 않도록 함

  // DevTools configuration parameters / DevTools 설정 파라미터
  params.append('experiments', 'true');
  params.append('improvedChromeReloads', 'true');
  params.append('experimental', 'true');

  // Enable panels / 패널 활성화
  params.append('enableConsole', 'true');
  params.append('enableRuntime', 'true');
  params.append('enableNetwork', 'true');
  params.append('enableDebugger', 'true');

  return baseUrl.toString();
}

/**
 * Read file and convert to CDP messages / 파일을 읽어서 CDP 메시지로 변환
 */
async function fileToCDPMessages(file: File): Promise<PostMessageCDPMessage[]> {
  const text = await file.text();
  const data: CDPEventFile = JSON.parse(text);

  if (!data.events || !Array.isArray(data.events)) {
    throw new Error('Invalid file format / 잘못된 파일 형식');
  }

  // Validate that all events are in postMessage format / 모든 이벤트가 postMessage 형식인지 검증
  const validMessages = data.events.filter((event) => {
    return event.type === 'CDP_MESSAGE' && typeof event.message === 'string';
  });

  if (validMessages.length !== data.events.length) {
    console.warn(
      'Some events are not in postMessage format, filtering them out / 일부 이벤트가 postMessage 형식이 아니어서 필터링됨'
    );
  }

  return validMessages;
}

/**
 * Send fake response for command / 명령에 대한 가짜 응답 전송
 */
function sendFakeResponse(targetWindow: Window, commandId: number, result?: unknown): void {
  setTimeout(() => {
    const responseMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify({
        id: commandId,
        result: result || {},
      }),
    };
    targetWindow.postMessage(responseMessage, '*');
  }, 10);
}

/**
 * Default initialization commands / 기본 초기화 명령
 */
const DEFAULT_INIT_COMMANDS = [
  { id: 1, method: 'Runtime.enable', params: {} },
  { id: 2, method: 'DOM.enable', params: {} },
  { id: 3, method: 'Network.enable', params: {} },
  { id: 4, method: 'DOMStorage.enable', params: {} },
  { id: 5, method: 'SessionReplay.enable', params: {} },
] as const;

/**
 * Send default initialization commands / 기본 초기화 명령 전송
 */
async function sendDefaultInitCommands(targetWindow: Window): Promise<void> {
  for (const cmd of DEFAULT_INIT_COMMANDS) {
    const commandMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify(cmd),
    };
    targetWindow.postMessage(commandMessage, '*');
    sendFakeResponse(targetWindow, cmd.id);
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

/**
 * Send CDP messages / CDP 메시지 전송
 */
async function sendCDPMessages(
  messages: PostMessageCDPMessage[],
  targetWindow: Window
): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  // Separate commands and events / 명령과 이벤트 분리
  const commands: PostMessageCDPMessage[] = [];
  const events: PostMessageCDPMessage[] = [];

  for (const msg of messages) {
    try {
      const parsed = JSON.parse(msg.message);
      if (parsed.id !== undefined) {
        commands.push(msg);
      } else {
        events.push(msg);
      }
    } catch {
      events.push(msg);
    }
  }

  // Send commands first / 먼저 명령 전송
  if (commands.length === 0) {
    await sendDefaultInitCommands(targetWindow);
  } else {
    for (const cmdMsg of commands) {
      try {
        const parsed = JSON.parse(cmdMsg.message);
        targetWindow.postMessage(cmdMsg, '*');
        if (parsed.id !== undefined) {
          sendFakeResponse(targetWindow, parsed.id);
        }
      } catch {
        // Failed to parse command / 명령 파싱 실패
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Send events in batches / 배치로 이벤트 전송
  const batchSize = 100;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    for (const message of batch) {
      try {
        targetWindow.postMessage(message, '*');
      } catch {
        // Failed to send message / 메시지 전송 실패
      }
    }
    if (i + batchSize < events.length) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/**
 * Load client script dynamically / 동적으로 클라이언트 스크립트 로드
 * Same as popup example / 팝업 예제와 동일
 * Uses built client.js from document build / 문서 빌드의 빌드된 client.js 사용
 */
function loadClientScript(): void {
  // Check if script is already loaded / 스크립트가 이미 로드되었는지 확인
  if (document.querySelector('script[data-chrome-remote-devtools-client]')) {
    return;
  }

  // Use built client.js from document build / 문서 빌드의 빌드된 client.js 사용
  const script = document.createElement('script');
  script.src = '/chrome-remote-devtools/client.js';
  script.setAttribute('data-enable-rrweb', 'true');
  script.setAttribute('data-chrome-remote-devtools-client', 'true');
  // Popup mode uses postMessage (no data-server-url needed) / 팝업 모드는 postMessage 사용 (data-server-url 불필요)
  document.head.appendChild(script);
}

/**
 * DevTools Playground Component / DevTools 플레이그라운드 컴포넌트
 * Opens DevTools in a popup window / 팝업 창에서 DevTools를 엽니다
 */
export function DevToolsPlayground({
  buttonText,
  lang = 'en',
}: {
  buttonText?: string;
  lang?: 'ko' | 'en';
}) {
  // Button texts based on language / 언어에 따른 버튼 텍스트
  const texts = {
    ko: {
      openDevTools: buttonText || 'DevTools 열기',
      testConsole: '콘솔 테스트',
      testNetwork: '네트워크 테스트',
      testLocalStorage: '로컬스토리지 테스트',
      replayFile: '파일 재생',
      exportFile: '파일 다운로드',
      loading: '로딩 중...',
      consoleLog: '콘솔 로그 메시지',
      consoleError: '콘솔 에러 메시지',
      consoleWarn: '콘솔 경고 메시지',
      consoleInfo: '콘솔 정보 메시지',
      networkSuccess: '네트워크 요청 성공',
      networkFailed: '네트워크 요청 실패',
      testData: '테스트 데이터',
      localStorageTest: '로컬스토리지 테스트',
      exportSuccess: '파일 다운로드 성공',
      exportFailed: '파일 다운로드 실패',
      exportNotAvailable:
        '이벤트 내보내기 기능을 사용할 수 없습니다. 클라이언트 스크립트가 로드되었는지 확인하세요.',
      replayLoadFailed: '리플레이 파일 로드 실패',
      popupFailed: '팝업 창 열기 실패',
    },
    en: {
      openDevTools: buttonText || 'Open DevTools',
      testConsole: 'Test Console',
      testNetwork: 'Test Network',
      testLocalStorage: 'Test LocalStorage',
      replayFile: 'Replay File',
      exportFile: 'Export File',
      loading: 'Loading...',
      consoleLog: 'Console log message',
      consoleError: 'Console error message',
      consoleWarn: 'Console warning message',
      consoleInfo: 'Console info message',
      networkSuccess: 'Network request successful',
      networkFailed: 'Network request failed',
      testData: 'Test data',
      localStorageTest: 'LocalStorage test',
      exportSuccess: 'File download successful',
      exportFailed: 'File download failed',
      exportNotAvailable: 'Event export is not available. Make sure the client script is loaded.',
      replayLoadFailed: 'Failed to load replay file',
      popupFailed: 'Failed to open popup window',
    },
  };

  const t = texts[lang];
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [_replayWindow, setReplayWindow] = useState<Window | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [_isReplayLoading, setIsReplayLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const interceptorRef = useRef<((event: MessageEvent) => void) | null>(null);
  const cdpMessagesRef = useRef<PostMessageCDPMessage[]>([]);
  const messagesSentRef = useRef(false);

  // Load client script on mount / 마운트 시 클라이언트 스크립트 로드
  useEffect(() => {
    loadClientScript();
  }, []);

  // Cleanup message handler on unmount / 언마운트 시 메시지 핸들러 정리
  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
      if (interceptorRef.current) {
        window.removeEventListener('message', interceptorRef.current, true);
      }
    };
  }, []);

  /**
   * Test console messages / 콘솔 메시지 테스트
   */
  const testConsole = () => {
    console.log(t.consoleLog);
    console.error(t.consoleError);
    console.warn(t.consoleWarn);
    console.info(t.consoleInfo);
  };

  /**
   * Test network request / 네트워크 요청 테스트
   */
  const testNetwork = async () => {
    try {
      const response = await fetch('https://api.github.com/repos/octocat/Hello-World');
      const data = await response.json();
      console.log(t.networkSuccess, data);
    } catch (error) {
      console.error(t.networkFailed, error);
    }
  };

  /**
   * Test localStorage / 로컬스토리지 테스트
   */
  const testLocalStorage = () => {
    const testData = {
      timestamp: new Date().toISOString(),
      message: t.testData,
    };
    localStorage.setItem('devtools-test', JSON.stringify(testData));
    const retrieved = localStorage.getItem('devtools-test');
    console.log(t.localStorageTest, retrieved);
  };

  /**
   * Handle file selection for replay / 리플레이를 위한 파일 선택 처리
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsReplayLoading(true);
    messagesSentRef.current = false;

    try {
      // Convert file to CDP messages / 파일을 CDP 메시지로 변환
      const messages = await fileToCDPMessages(file);
      cdpMessagesRef.current = messages;

      // Mark that we're in replay mode to prevent client from connecting / replay 모드임을 표시하여 클라이언트가 연결하지 않도록 함
      if (typeof window !== 'undefined') {
        (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = true;
      }

      // Open DevTools in replay mode / replay 모드로 DevTools 열기
      const replayUrl = buildDevToolsReplayUrl();
      const newWindow = window.open(
        replayUrl,
        'devtools-replay',
        'width=1200,height=800,resizable=yes,scrollbars=yes'
      );

      if (!newWindow) {
        // Clear replay mode flag on error / 에러 시 replay 모드 플래그 제거
        if (typeof window !== 'undefined') {
          (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = false;
        }
        throw new Error(t.popupFailed);
      }

      setReplayWindow(newWindow);

      // Clean up previous handler / 이전 핸들러 정리
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
      // Clean up previous interceptor / 이전 인터셉터 정리
      if (interceptorRef.current) {
        window.removeEventListener('message', interceptorRef.current, true);
      }

      // Set up message handler / 메시지 핸들러 설정
      const handleMessage = (event: MessageEvent) => {
        // Only handle messages from replay window / replay 창에서 온 메시지만 처리
        if (event.source !== newWindow) {
          return;
        }

        // In replay mode, only handle control messages (DEVTOOLS_READY, etc.) / replay 모드에서는 제어 메시지만 처리 (DEVTOOLS_READY 등)
        // Ignore all CDP_MESSAGE events from the original page / 원본 페이지에서 온 모든 CDP_MESSAGE 이벤트 무시
        // Only messages from the file will be sent / 파일에서 읽은 메시지만 전송됨
        if (event.data?.type === 'CDP_MESSAGE') {
          // Ignore CDP messages in replay mode - only file messages should be processed / replay 모드에서 CDP 메시지 무시 - 파일 메시지만 처리되어야 함
          return;
        }

        // Handle DevTools ready message / DevTools 준비 메시지 처리
        if (event.data?.type === 'DEVTOOLS_READY') {
          if (!messagesSentRef.current && cdpMessagesRef.current.length > 0) {
            // Wait a bit for DevTools to fully initialize / DevTools가 완전히 초기화될 시간 제공
            setTimeout(() => {
              if (!messagesSentRef.current && cdpMessagesRef.current.length > 0 && newWindow) {
                void sendCDPMessages(cdpMessagesRef.current, newWindow);
                messagesSentRef.current = true;
                setIsReplayLoading(false);
              }
            }, 1000);
          }
        }
      };

      // Prevent client from connecting to replay window / 클라이언트가 replay 창에 연결하지 않도록 방지
      // Intercept DEVTOOLS_READY messages from replay window before client receives them / 클라이언트가 받기 전에 replay 창에서 온 DEVTOOLS_READY 메시지 가로채기
      const interceptReplayMessages = (event: MessageEvent) => {
        // Only intercept messages from replay window / replay 창에서 온 메시지만 가로채기
        if (event.source !== newWindow) {
          return;
        }

        // If this is DEVTOOLS_READY from replay window, prevent it from reaching the client / replay 창에서 온 DEVTOOLS_READY인 경우 클라이언트에 도달하지 않도록 방지
        if (event.data?.type === 'DEVTOOLS_READY') {
          // Stop propagation to prevent client from receiving this message / 클라이언트가 이 메시지를 받지 않도록 전파 중지
          event.stopImmediatePropagation();
          // Also stop the event from bubbling / 이벤트 버블링도 중지
          if (event.stopPropagation) {
            event.stopPropagation();
          }
          // Prevent default behavior / 기본 동작 방지
          event.preventDefault();
        }
      };

      // Add interceptor before other message handlers / 다른 메시지 핸들러보다 먼저 인터셉터 추가
      // Use capture phase to intercept before client's handler / 클라이언트의 핸들러보다 먼저 가로채기 위해 capture 단계 사용
      interceptorRef.current = interceptReplayMessages;
      window.addEventListener('message', interceptReplayMessages, true);

      messageHandlerRef.current = handleMessage;
      window.addEventListener('message', handleMessage);

      // Cleanup interceptor when window is closed / 창이 닫힐 때 인터셉터 정리
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          // Clear replay mode flag / replay 모드 플래그 제거
          if (typeof window !== 'undefined') {
            (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = false;
          }
          if (interceptorRef.current) {
            window.removeEventListener('message', interceptorRef.current, true);
            interceptorRef.current = null;
          }
          if (messageHandlerRef.current) {
            window.removeEventListener('message', messageHandlerRef.current);
            messageHandlerRef.current = null;
          }
          clearInterval(checkClosed);
          setReplayWindow(null);
        }
      }, 1000);

      // Fallback: send messages after 5 seconds if DEVTOOLS_READY not received / 폴백: DEVTOOLS_READY를 받지 못한 경우 5초 후 메시지 전송
      setTimeout(() => {
        if (!messagesSentRef.current && cdpMessagesRef.current.length > 0 && newWindow) {
          void sendCDPMessages(cdpMessagesRef.current, newWindow);
          messagesSentRef.current = true;
          setIsReplayLoading(false);
        }
      }, 5000);
    } catch (error) {
      // Clear replay mode flag on error / 에러 시 replay 모드 플래그 제거
      if (typeof window !== 'undefined') {
        (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = false;
      }
      console.error(t.replayLoadFailed, error);
      setIsReplayLoading(false);
      alert(error instanceof Error ? error.message : t.replayLoadFailed);
    }
  };

  /**
   * Handle open DevTools / DevTools 열기 처리
   */
  const handleOpenDevTools = () => {
    const devToolsUrl = buildDevToolsUrl();

    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
    } else {
      const newWindow = window.open(
        devToolsUrl,
        'devtools',
        'width=1200,height=800,resizable=yes,scrollbars=yes'
      );
      if (newWindow) {
        setPopupWindow(newWindow);

        // Set up message handler to ensure stored events are replayed / 저장된 이벤트가 재생되도록 메시지 핸들러 설정
        const handleDevToolsMessage = (event: MessageEvent) => {
          // Only handle messages from DevTools window / DevTools 창에서 온 메시지만 처리
          if (event.source !== newWindow) {
            return;
          }

          // Handle DevTools ready message / DevTools 준비 메시지 처리
          // The client script will automatically replay stored events when it receives DEVTOOLS_READY / 클라이언트 스크립트는 DEVTOOLS_READY를 받으면 자동으로 저장된 이벤트를 재생함
          if (event.data?.type === 'DEVTOOLS_READY') {
            // Client script should handle this automatically, but we can also trigger it manually if needed / 클라이언트 스크립트가 자동으로 처리해야 하지만 필요시 수동으로 트리거할 수도 있음
            // The PostMessageHandler in the client will receive this and call setDevToolsWindow / 클라이언트의 PostMessageHandler가 이를 받아서 setDevToolsWindow를 호출함
            // This will trigger sendStoredEventsFromIndexedDB() which replays console, network, etc. / 이것은 sendStoredEventsFromIndexedDB()를 트리거하여 console, network 등을 재생함
            // SessionReplay events are handled separately by SessionReplay domain / SessionReplay 이벤트는 SessionReplay 도메인에서 별도로 처리됨
          }
        };

        // Listen for messages from DevTools / DevTools에서 온 메시지 수신
        window.addEventListener('message', handleDevToolsMessage);

        // Cleanup when window is closed / 창이 닫힐 때 정리
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            window.removeEventListener('message', handleDevToolsMessage);
            clearInterval(checkClosed);
            setPopupWindow(null);
          }
        }, 1000);
      }
    }
  };

  /**
   * Handle open replay file / 리플레이 파일 열기 처리
   */
  const handleOpenReplayFile = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle export events to file / 이벤트를 파일로 내보내기 처리
   */
  const handleExportFile = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).chromeRemoteDevTools) {
        await (window as any).chromeRemoteDevTools.exportEvents();
        console.log(t.exportSuccess);
      } else {
        alert(t.exportNotAvailable);
      }
    } catch (error) {
      console.error(t.exportFailed, error);
      alert(t.exportFailed);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginTop: '16px',
      }}
    >
      <button
        onClick={handleOpenDevTools}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: '12px 24px',
          background: isHovered ? '#2563eb' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
      >
        {t.openDevTools}
      </button>

      <button
        onClick={testConsole}
        style={{
          padding: '12px 24px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#059669';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#10b981';
        }}
      >
        {t.testConsole}
      </button>

      <button
        onClick={testNetwork}
        style={{
          padding: '12px 24px',
          background: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#7c3aed';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#8b5cf6';
        }}
      >
        {t.testNetwork}
      </button>

      <button
        onClick={testLocalStorage}
        style={{
          padding: '12px 24px',
          background: '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#d97706';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f59e0b';
        }}
      >
        {t.testLocalStorage}
      </button>

      <input
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      <button
        onClick={handleOpenReplayFile}
        disabled={true}
        style={{
          padding: '12px 24px',
          background: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'not-allowed',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
          opacity: 0.6,
        }}
      >
        {t.replayFile}
      </button>

      <button
        onClick={handleExportFile}
        disabled={true}
        style={{
          padding: '12px 24px',
          background: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'not-allowed',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
          opacity: 0.6,
        }}
      >
        {t.exportFile}
      </button>
    </div>
  );
}
