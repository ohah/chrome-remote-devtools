// Replay route / Replay 라우트 (Offline File DevTools / 오프라인 파일 DevTools)
import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { fileToCDPMessages } from '@/shared/lib/file-to-cdp';
import { buildDevToolsReplayUrl } from '@/shared/lib/devtools-url';

// File-based routing: routes/replay.tsx automatically maps to `/replay` / 파일 기반 라우팅: routes/replay.tsx가 자동으로 `/replay`에 매핑됨
export const Route = createFileRoute('/replay')({
  component: ReplayPage,
});

function ReplayPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devtoolsUrl, setDevtoolsUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setSelectedFile(file);
    // Reset DevTools URL when new file is selected / 새 파일 선택 시 DevTools URL 초기화
    setDevtoolsUrl(null);

    // Automatically open DevTools when file is selected / 파일 선택 시 자동으로 DevTools 열기
    void handleOpenReplayDevTools(file);
  };

  const handleOpenReplayDevTools = async (file?: File | null) => {
    const fileToUse = file ?? selectedFile;
    if (!fileToUse) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert events to CDP messages / 이벤트를 CDP 메시지로 변환
      const cdpMessages = await fileToCDPMessages(fileToUse);

      if (!iframeRef.current) {
        throw new Error('Iframe not available / Iframe을 사용할 수 없습니다');
      }

      // Clean up previous handlers / 이전 핸들러 정리
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Store CDP messages in ref so they're accessible in message handler / CDP 메시지를 ref에 저장하여 메시지 핸들러에서 접근 가능하도록
      const cdpMessagesRef = { current: cdpMessages };
      // Event buffer for messages that arrive when panel is inactive / 패널이 비활성화 상태일 때 도착한 메시지를 위한 이벤트 버퍼
      const eventBufferRef = { current: [] as typeof cdpMessages };
      // Track if panel is currently active / 패널이 현재 활성화되어 있는지 추적
      const isPanelActiveRef = { current: false };
      // Track if messages have been sent to prevent duplicate sending / 중복 전송 방지를 위한 메시지 전송 여부 추적
      const messagesSentRef = { current: false };

      // Response body store for replay mode / replay 모드를 위한 응답 본문 저장소
      const responseBodyStore = {
        // Internal storage / 내부 저장소
        _storage: new Map<string, string>(),

        /**
         * Store response body from responseReceived event / responseReceived 이벤트에서 응답 본문 저장
         * @param requestId - Request identifier / 요청 식별자
         * @param body - Response body / 응답 본문
         */
        store(requestId: string, body: string): void {
          if (requestId && body) {
            this._storage.set(requestId, body);
          }
        },

        /**
         * Get stored response body / 저장된 응답 본문 가져오기
         * @param requestId - Request identifier / 요청 식별자
         * @returns Response body or undefined / 응답 본문 또는 undefined
         */
        get(requestId: string): string | undefined {
          return this._storage.get(requestId);
        },

        /**
         * Check if response body exists / 응답 본문 존재 여부 확인
         * @param requestId - Request identifier / 요청 식별자
         * @returns True if exists / 존재하면 true
         */
        has(requestId: string): boolean {
          return this._storage.has(requestId);
        },

        /**
         * Clear all stored response bodies / 저장된 모든 응답 본문 삭제
         */
        clear(): void {
          this._storage.clear();
        },
      };

      // Function to send fake responses for commands / 명령에 대한 가짜 응답 전송 함수
      const sendFakeResponse = (targetWindow: Window, commandId: number, result?: unknown) => {
        // Send fake response for command / 명령에 대한 가짜 응답 전송
        // In replay mode, there's no backend, so we simulate successful responses / replay 모드에서는 백엔드가 없으므로 성공 응답을 시뮬레이션
        setTimeout(() => {
          const responseMessage = {
            type: 'CDP_MESSAGE' as const,
            message: JSON.stringify({
              id: commandId,
              result: result || {}, // Use provided result or empty object / 제공된 result 사용 또는 빈 객체
            }),
          };
          targetWindow.postMessage(responseMessage, '*');
        }, 10); // Small delay to ensure command is processed first / 명령이 먼저 처리되도록 작은 지연
      };

      // Function to send buffered CDP messages / 버퍼에 있는 CDP 메시지 전송 함수
      const sendBufferedMessages = async (messages: typeof cdpMessages) => {
        if (!iframeRef.current?.contentWindow || messages.length === 0) {
          return;
        }

        const targetWindow = iframeRef.current.contentWindow;

        // Extract and store response bodies from responseReceived events before sending / 전송 전에 responseReceived 이벤트에서 응답 본문 추출 및 저장
        for (const msg of messages) {
          try {
            const parsed = JSON.parse(msg.message);
            if (parsed.method === 'Network.responseReceived' && parsed.params?.response?.body) {
              const requestId = parsed.params.requestId;
              const body = parsed.params.response.body;
              responseBodyStore.store(requestId, body);
            }
          } catch {
            // Ignore parsing errors / 파싱 오류 무시
          }
        }

        // Send messages in batches / 배치로 메시지 전송
        const batchSize = 100;
        for (let i = 0; i < messages.length; i += batchSize) {
          const batch = messages.slice(i, i + batchSize);
          for (const message of batch) {
            if (iframeRef.current?.contentWindow) {
              try {
                targetWindow.postMessage(message, '*');
              } catch {
                // Failed to send message / 메시지 전송 실패
              }
            }
          }
          // Small delay between batches / 배치 간 작은 지연
          if (i + batchSize < messages.length) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
      };

      // Function to send SessionReplay events only / SessionReplay 이벤트만 전송하는 함수
      const sendSessionReplayEvents = async () => {
        if (!iframeRef.current?.contentWindow) {
          return;
        }

        // Collect all messages / 모든 메시지 수집
        const messagesToSend = [...cdpMessagesRef.current, ...eventBufferRef.current];

        if (messagesToSend.length === 0) {
          return;
        }

        // Filter only SessionReplay events / SessionReplay 이벤트만 필터링
        const sessionReplayEvents = messagesToSend.filter((msg) => {
          try {
            const parsed = JSON.parse(msg.message);
            return parsed.method?.startsWith('SessionReplay.');
          } catch {
            return false;
          }
        });

        if (sessionReplayEvents.length > 0) {
          await sendBufferedMessages(sessionReplayEvents);
        }
      };

      // Function to send CDP messages when DevTools is ready / DevTools가 준비될 때 CDP 메시지 전송 함수
      const sendCDPMessages = async (includeSessionReplay = false) => {
        // Prevent duplicate sending / 중복 전송 방지
        if (messagesSentRef.current || !iframeRef.current?.contentWindow) {
          return;
        }

        const targetWindow = iframeRef.current.contentWindow;

        // Mark as sent to prevent duplicate calls / 중복 호출 방지를 위해 전송 완료 표시
        messagesSentRef.current = true;

        // Mark panel as active / 패널을 활성화 상태로 표시
        isPanelActiveRef.current = true;

        // Collect all messages to send: initial messages + buffered messages / 전송할 모든 메시지 수집: 초기 메시지 + 버퍼에 있는 메시지
        const messagesToSend = [...cdpMessagesRef.current, ...eventBufferRef.current];

        if (messagesToSend.length === 0) {
          setIsLoading(false);
          return;
        }

        // Separate commands and events / 명령과 이벤트 분리
        const commands: typeof cdpMessages = [];
        const events: typeof cdpMessages = [];

        for (const msg of messagesToSend) {
          try {
            const parsed = JSON.parse(msg.message);
            if (parsed.id !== undefined) {
              // This is a command / 이것은 명령임
              commands.push(msg);
            } else {
              // This is an event / 이것은 이벤트임
              events.push(msg);
            }
          } catch {
            // If parsing fails, treat as event / 파싱 실패 시 이벤트로 처리
            events.push(msg);
          }
        }

        // Send commands first (initialization commands from file) / 먼저 명령 전송 (파일에서 읽은 초기화 명령)
        // If no commands in file, send default initialization commands / 파일에 명령이 없으면 기본 초기화 명령 전송
        if (commands.length === 0) {
          // Send default initialization commands / 기본 초기화 명령 전송
          const defaultInitCommands = [
            { id: 1, method: 'Runtime.enable', params: {} },
            { id: 2, method: 'DOM.enable', params: {} },
            { id: 3, method: 'Network.enable', params: {} },
            { id: 4, method: 'DOMStorage.enable', params: {} },
            { id: 5, method: 'SessionReplay.enable', params: {} },
          ];

          for (const cmd of defaultInitCommands) {
            const commandMessage = {
              type: 'CDP_MESSAGE' as const,
              message: JSON.stringify(cmd),
            };
            targetWindow.postMessage(commandMessage, '*');
            sendFakeResponse(targetWindow, cmd.id);
          }
          // Wait for DevTools to process initialization commands / DevTools가 초기화 명령을 처리할 시간 대기
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          // Send commands from file / 파일에서 읽은 명령 전송
          for (const commandMsg of commands) {
            try {
              const parsed = JSON.parse(commandMsg.message);
              targetWindow.postMessage(commandMsg, '*');
              // Send fake response for command / 명령에 대한 가짜 응답 전송
              if (parsed.id !== undefined) {
                sendFakeResponse(targetWindow, parsed.id);
              }
            } catch {
              // Failed to parse command / 명령 파싱 실패
            }
          }
          // Wait for DevTools to process commands / DevTools가 명령을 처리할 시간 대기
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Separate events by type / 이벤트 타입별로 분리
        const domStorageEvents = events.filter((msg) => {
          try {
            const parsed = JSON.parse(msg.message);
            return parsed.method?.startsWith('DOMStorage.');
          } catch {
            return false;
          }
        });

        const sessionReplayEvents = events.filter((msg) => {
          try {
            const parsed = JSON.parse(msg.message);
            return parsed.method?.startsWith('SessionReplay.');
          } catch {
            return false;
          }
        });

        const otherEvents = events.filter((msg) => {
          try {
            const parsed = JSON.parse(msg.message);
            return (
              !parsed.method?.startsWith('DOMStorage.') &&
              !parsed.method?.startsWith('SessionReplay.')
            );
          } catch {
            return true; // If parsing fails, include it in other events / 파싱 실패 시 다른 이벤트에 포함
          }
        });

        // Send DOMStorage events first (initial state) / DOMStorage 이벤트를 먼저 전송 (초기 상태)
        if (domStorageEvents.length > 0) {
          await sendBufferedMessages(domStorageEvents);
          // Delay to ensure DOMStorage events are processed / DOMStorage 이벤트가 처리될 시간 제공
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Then send other events / 그 다음 다른 이벤트 전송
        // Note: sendBufferedMessages will extract and store response bodies before sending / 참고: sendBufferedMessages가 전송 전에 응답 본문을 추출하고 저장함
        if (otherEvents.length > 0) {
          await sendBufferedMessages(otherEvents);
        }

        // Send SessionReplay events if this is the first activation / 첫 활성화인 경우 SessionReplay 이벤트도 전송
        if (includeSessionReplay && sessionReplayEvents.length > 0) {
          await sendBufferedMessages(sessionReplayEvents);
        }

        // Keep SessionReplay events for later when panel is activated / SessionReplay 이벤트는 나중에 패널이 활성화될 때를 위해 유지
        // Clear other events but keep SessionReplay events / 다른 이벤트는 비우고 SessionReplay 이벤트는 유지
        cdpMessagesRef.current = sessionReplayEvents;
        eventBufferRef.current = [];

        setIsLoading(false);
      };

      // Wait for DevTools to be ready / DevTools 준비 대기
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) {
          return;
        }

        // Handle getResponseBody command from DevTools / DevTools에서 getResponseBody 명령 처리
        if (event.data?.type === 'CDP_MESSAGE') {
          try {
            const parsed = JSON.parse(event.data.message);
            // Check if this is a getResponseBody command / getResponseBody 명령인지 확인
            if (parsed.method === 'Network.getResponseBody' && parsed.id !== undefined) {
              const requestId = parsed.params?.requestId;
              if (!requestId || !iframeRef.current?.contentWindow) {
                return;
              }

              // Get stored response body / 저장된 응답 본문 가져오기
              const body = responseBodyStore.get(requestId);
              sendFakeResponse(iframeRef.current.contentWindow, parsed.id, {
                body: body || '',
                base64Encoded: false,
              });
              return; // Don't process further / 더 이상 처리하지 않음
            }
          } catch {
            // Ignore parsing errors / 파싱 오류 무시
          }
        }

        // Handle DevTools ready message / DevTools 준비 메시지 처리
        if (event.data?.type === 'DEVTOOLS_READY') {
          // DevTools is ready, send messages if not already sent / DevTools가 준비되었으므로 아직 전송되지 않았다면 메시지 전송
          if (!messagesSentRef.current && cdpMessagesRef.current.length > 0) {
            // Wait a bit for DevTools to fully initialize / DevTools가 완전히 초기화될 시간 제공
            setTimeout(() => {
              if (!messagesSentRef.current && cdpMessagesRef.current.length > 0) {
                void sendCDPMessages();
              }
            }, 1000);
          }
        }
        // Handle SessionReplay panel activation / SessionReplay 패널 활성화 처리
        else if (event.data?.type === 'SESSION_REPLAY_READY') {
          // Mark as ready / 준비 상태로 표시
          isPanelActiveRef.current = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          // Send messages when panel is activated / 패널이 활성화될 때 메시지 전송
          // If this is the first activation, send all messages including SessionReplay / 첫 활성화인 경우 SessionReplay를 포함한 모든 메시지 전송
          if (!messagesSentRef.current && cdpMessagesRef.current.length > 0) {
            void sendCDPMessages(true); // Include SessionReplay events on first activation / 첫 활성화 시 SessionReplay 이벤트 포함
          } else {
            // If other messages already sent, only send SessionReplay events / 다른 메시지가 이미 전송되었다면 SessionReplay 이벤트만 전송
            void sendSessionReplayEvents();
          }
        } else if (event.data?.type === 'SESSION_REPLAY_HIDDEN') {
          // Handle SessionReplay panel deactivation / SessionReplay 패널 비활성화 처리
          isPanelActiveRef.current = false;
        }
      };

      // Build DevTools URL / DevTools URL 구성
      const url = buildDevToolsReplayUrl();

      // Set up message listener BEFORE setting iframe src / iframe src 설정 전에 메시지 리스너 설정
      messageHandlerRef.current = handleMessage;
      window.addEventListener('message', handleMessage);

      // Set iframe src directly (don't wait for React state update) / iframe src를 직접 설정 (React state 업데이트 대기하지 않음)
      iframeRef.current.src = url;
      setDevtoolsUrl(url); // Also update state for UI / UI를 위해 state도 업데이트

      // Handle iframe load to send messages automatically / iframe 로드를 처리하여 자동으로 메시지 전송
      const handleIframeLoadInternal = () => {
        // Wait for DevTools to initialize, then send messages / DevTools 초기화 대기 후 메시지 전송
        // This ensures messages are sent regardless of which panel is active / 어떤 패널이 활성화되어 있든 메시지가 전송되도록 보장
        // DEVTOOLS_READY or SESSION_REPLAY_READY will trigger earlier sending / DEVTOOLS_READY 또는 SESSION_REPLAY_READY가 더 일찍 전송을 트리거함
        setTimeout(() => {
          if (
            iframeRef.current?.contentWindow &&
            cdpMessagesRef.current.length > 0 &&
            !messagesSentRef.current
          ) {
            void sendCDPMessages();
          }
        }, 5000); // Give DevTools time to fully initialize (backup if DEVTOOLS_READY not received) / DevTools가 완전히 초기화될 시간 제공 (DEVTOOLS_READY를 받지 못한 경우 백업)
      };

      // Set up iframe load handler / iframe 로드 핸들러 설정
      iframeRef.current.addEventListener('load', handleIframeLoadInternal);

      // Timeout after 10 seconds / 10초 후 타임아웃
      timeoutRef.current = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        messageHandlerRef.current = null;
        // Check if messages were sent / 메시지가 전송되었는지 확인
        if (!messagesSentRef.current && cdpMessagesRef.current.length > 0) {
          setIsLoading(false);
          setError('DevTools did not respond in time / DevTools가 시간 내에 응답하지 않았습니다');
        }
      }, 10000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to open replay DevTools / Replay DevTools 열기 실패'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 relative overflow-hidden">
      <input
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        ref={fileInputRef}
      />
      {/* Fixed Select File button / 고정된 Select File 버튼 */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-md transition-all shadow-lg backdrop-blur-sm"
        disabled={isLoading}
      >
        Select File
      </button>

      {/* Error message / 에러 메시지 */}
      {error && (
        <div className="fixed top-4 left-4 z-50 p-3 bg-red-900/90 border border-red-700 rounded-md text-red-200 text-sm shadow-lg backdrop-blur-sm max-w-md">
          {error}
        </div>
      )}

      {/* DevTools iframe (always rendered, hidden when not ready) / DevTools iframe (항상 렌더링, 준비되지 않았을 때 숨김) */}
      <iframe
        ref={iframeRef}
        src={devtoolsUrl || undefined}
        className={`w-full h-full border-none ${devtoolsUrl ? '' : 'hidden'}`}
        title="Replay DevTools"
      />

      {/* Loading/Empty states overlay / 로딩/빈 상태 오버레이 */}
      {!devtoolsUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          {selectedFile ? (
            <div className="text-center">
              <div className="text-lg text-gray-400 mb-4">
                Selected: <span className="text-gray-200">{selectedFile.name}</span>
              </div>
              {isLoading ? (
                <div className="text-gray-400">Opening DevTools...</div>
              ) : (
                <button
                  onClick={() => void handleOpenReplayDevTools()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  Open Replay DevTools
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Offline File DevTools</h1>
              <p className="text-gray-400">Select a JSON file to start</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
