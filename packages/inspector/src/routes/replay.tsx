// Replay route / Replay 라우트 (Offline File DevTools / 오프라인 파일 DevTools)
import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { fileToCDPMessages } from '@/shared/lib/file-to-cdp';
import { buildDevToolsReplayUrl } from '@/shared/lib/devtools-url';
import { createResponseBodyStore } from './replay/utils/response-body-store';
import { handleCDPCommand } from './replay/utils/message-handlers';
import { sendCDPMessages, sendSessionReplayEvents } from './replay/utils/message-sender-extended';
import type { SendCDPMessagesContext } from './replay/utils/message-sender-extended';

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
      const responseBodyStore = createResponseBodyStore();

      // Wait for DevTools to be ready / DevTools 준비 대기
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) {
          return;
        }

        // Handle commands from DevTools / DevTools에서 명령 처리
        if (event.data?.type === 'CDP_MESSAGE') {
          try {
            const parsed = JSON.parse(event.data.message);
            if (parsed.id === undefined || !iframeRef.current?.contentWindow) {
              return;
            }

            const targetWindow = iframeRef.current.contentWindow;

            // Create handler context / 핸들러 컨텍스트 생성
            const handlerContext = {
              file: fileToUse,
              cdpMessages: cdpMessagesRef.current,
              responseBodyStore,
              targetWindow,
            };

            // Try to handle command / 명령 처리 시도
            handleCDPCommand(parsed, handlerContext);
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
                const sendContext: SendCDPMessagesContext = {
                  cdpMessages: cdpMessagesRef.current,
                  eventBuffer: eventBufferRef.current,
                  file: fileToUse,
                  targetWindow: iframeRef.current!.contentWindow!,
                  responseBodyStore,
                  setIsLoading,
                };
                void sendCDPMessages(sendContext);
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
            const sendContext: SendCDPMessagesContext = {
              cdpMessages: cdpMessagesRef.current,
              eventBuffer: eventBufferRef.current,
              file: fileToUse,
              targetWindow: iframeRef.current!.contentWindow!,
              responseBodyStore,
              setIsLoading,
            };
            void sendCDPMessages(sendContext, true); // Include SessionReplay events on first activation / 첫 활성화 시 SessionReplay 이벤트 포함
          } else {
            // If other messages already sent, only send SessionReplay events / 다른 메시지가 이미 전송되었다면 SessionReplay 이벤트만 전송
            const sendContext: SendCDPMessagesContext = {
              cdpMessages: cdpMessagesRef.current,
              eventBuffer: eventBufferRef.current,
              file: fileToUse,
              targetWindow: iframeRef.current!.contentWindow!,
              responseBodyStore,
              setIsLoading,
            };
            void sendSessionReplayEvents(sendContext);
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
            const sendContext: SendCDPMessagesContext = {
              cdpMessages: cdpMessagesRef.current,
              eventBuffer: eventBufferRef.current,
              file: fileToUse,
              targetWindow: iframeRef.current.contentWindow,
              responseBodyStore,
              setIsLoading,
            };
            void sendCDPMessages(sendContext);
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
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
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
