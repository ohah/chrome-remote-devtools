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
  };

  const handleOpenReplayDevTools = async () => {
    if (!selectedFile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert events to CDP messages / 이벤트를 CDP 메시지로 변환
      const cdpMessages = await fileToCDPMessages(selectedFile);

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

      // Function to send initialization commands / 초기화 명령 전송 함수
      const sendInitializationCommands = (targetWindow: Window) => {
        // Send CDP commands to enable domains and initialize models / 도메인 활성화 및 모델 초기화를 위한 CDP 명령 전송
        const initCommands = [
          { id: 1, method: 'Runtime.enable', params: {} },
          { id: 2, method: 'DOM.enable', params: {} },
          { id: 3, method: 'Network.enable', params: {} },
          { id: 4, method: 'SessionReplay.enable', params: {} },
        ];

        // Send commands and fake responses / 명령 전송 및 가짜 응답 전송
        initCommands.forEach((cmd) => {
          // Send command / 명령 전송
          const commandMessage = {
            type: 'CDP_MESSAGE' as const,
            message: JSON.stringify(cmd),
          };
          targetWindow.postMessage(commandMessage, '*');

          // Send fake response immediately after command / 명령 직후 가짜 응답 전송
          // In replay mode, there's no backend, so we simulate successful responses / replay 모드에서는 백엔드가 없으므로 성공 응답을 시뮬레이션
          setTimeout(() => {
            const responseMessage = {
              type: 'CDP_MESSAGE' as const,
              message: JSON.stringify({
                id: cmd.id,
                result: {}, // Empty result for enable commands / enable 명령에 대한 빈 결과
              }),
            };
            targetWindow.postMessage(responseMessage, '*');
          }, 10); // Small delay to ensure command is processed first / 명령이 먼저 처리되도록 작은 지연
        });
      };

      // Function to send buffered CDP messages / 버퍼에 있는 CDP 메시지 전송 함수
      const sendBufferedMessages = async (messages: typeof cdpMessages) => {
        if (!iframeRef.current?.contentWindow || messages.length === 0) {
          return;
        }

        const targetWindow = iframeRef.current.contentWindow;

        // Send messages in batches / 배치로 메시지 전송
        const batchSize = 100;
        for (let i = 0; i < messages.length; i += batchSize) {
          const batch = messages.slice(i, i + batchSize);
          for (const message of batch) {
            if (iframeRef.current?.contentWindow) {
              try {
                targetWindow.postMessage(message, '*');
              } catch (_error) {
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

      // Function to send CDP messages when panel is activated / 패널이 활성화될 때 CDP 메시지 전송 함수
      const sendCDPMessages = async () => {
        if (!iframeRef.current?.contentWindow) {
          return;
        }

        const targetWindow = iframeRef.current.contentWindow;

        // Mark panel as active / 패널을 활성화 상태로 표시
        isPanelActiveRef.current = true;

        // First, send initialization commands to enable domains (only on first activation) / 먼저 도메인 활성화를 위한 초기화 명령 전송 (첫 활성화 시에만)
        // Check if we have initial messages (from file) that haven't been sent yet / 아직 전송되지 않은 초기 메시지(파일에서 읽은)가 있는지 확인
        const isFirstActivation = cdpMessagesRef.current.length > 0;
        if (isFirstActivation) {
          sendInitializationCommands(targetWindow);
        }

        // Wait a bit for DevTools to fully initialize onMessage handler and process init commands / DevTools가 onMessage 핸들러를 완전히 초기화하고 초기화 명령을 처리할 시간을 주기 위해 잠시 대기
        // Collect all messages to send: initial messages + buffered messages / 전송할 모든 메시지 수집: 초기 메시지 + 버퍼에 있는 메시지
        const messagesToSend = [...cdpMessagesRef.current, ...eventBufferRef.current];

        if (messagesToSend.length === 0) {
          setIsLoading(false);
          return;
        }

        // Send all buffered messages / 버퍼에 있는 모든 메시지 전송
        await sendBufferedMessages(messagesToSend);

        // Clear buffers after sending / 전송 후 버퍼 비우기
        cdpMessagesRef.current = [];
        eventBufferRef.current = [];

        setIsLoading(false);
      };

      // Wait for DevTools to be ready / DevTools 준비 대기
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) {
          return;
        }

        // Handle SessionReplay panel activation / SessionReplay 패널 활성화 처리
        if (event.data?.type === 'SESSION_REPLAY_READY') {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          // todo: 1500ms 대신 렌더링 완전 끝난 후가 되게 변경 해야함
          setTimeout(() => {
            console.log('전송..');
            // Send all buffered messages when panel is activated / 패널이 활성화될 때 버퍼에 있는 모든 메시지 전송
            void sendCDPMessages();
          }, 1500);
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

      // Timeout after 10 seconds / 10초 후 타임아웃
      timeoutRef.current = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        messageHandlerRef.current = null;
        // Check if panel was ever activated / 패널이 한 번이라도 활성화되었는지 확인
        if (!isPanelActiveRef.current && cdpMessagesRef.current.length > 0) {
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

  // Handle iframe load / iframe 로드 처리
  const handleIframeLoad = () => {
    // Iframe is loaded, but we still need to wait for DEVTOOLS_READY message / Iframe은 로드되었지만 DEVTOOLS_READY 메시지를 기다려야 함
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Offline File DevTools</h1>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            disabled={isLoading}
          >
            Select File
          </button>

          {selectedFile && (
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-4">
                Selected: <span className="text-gray-200">{selectedFile.name}</span>
              </div>
              <button
                onClick={handleOpenReplayDevTools}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Opening DevTools...' : 'Open Replay DevTools'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* DevTools iframe / DevTools iframe */}
          {selectedFile && (
            <div className="mt-6 w-full h-[600px] border border-gray-700 rounded-lg overflow-hidden">
              <iframe
                ref={iframeRef}
                src={devtoolsUrl || undefined}
                className="w-full h-full border-none"
                title="Replay DevTools"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
