// DevTools iframe component / DevTools iframe 컴포넌트
import { useEffect, useRef, useState, useCallback } from 'react';
import { buildDevToolsUrl, getServerUrl } from '../utils/devtools';

interface DevToolsIframeProps {
  clientId: string | null;
}

// Message types for postMessage communication / postMessage 통신을 위한 메시지 타입
interface CDPMessage {
  type: 'CDP_MESSAGE';
  message: string;
}

interface DevToolsReadyMessage {
  type: 'DEVTOOLS_READY';
}

type PostMessageData = CDPMessage | DevToolsReadyMessage;

export default function DevToolsIframe({ clientId }: DevToolsIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draggableRef = useRef<HTMLDivElement>(null);
  const previousClientIdRef = useRef<string | null>(null);
  const [height, setHeight] = useState(() => {
    // Load saved height from localStorage / localStorage에서 저장된 높이 로드
    const saved = localStorage.getItem('chii-embedded-height');
    return saved
      ? Math.max(100, Math.min(window.innerHeight, parseInt(saved, 10)))
      : Math.round(window.innerHeight * 0.5);
  });
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const originHeightRef = useRef(0);

  // Update height and save to localStorage / 높이 업데이트 및 localStorage에 저장
  const updateHeight = useCallback((newHeight: number) => {
    const clamped = Math.max(100, Math.min(window.innerHeight, newHeight));
    setHeight(clamped);
    localStorage.setItem('chii-embedded-height', clamped.toString());
  }, []);

  // Handle resize start / 리사이즈 시작 처리
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      originHeightRef.current = height;
    },
    [height]
  );

  // Handle resize move / 리사이즈 이동 처리
  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      e.stopPropagation();
      e.preventDefault();
      const deltaY = e.clientY - startYRef.current;
      // Upward drag increases height, downward drag decreases height / 위로 드래그하면 높이 증가, 아래로 드래그하면 높이 감소
      const newHeight = originHeightRef.current - deltaY;
      updateHeight(newHeight);
    },
    [isResizing, updateHeight]
  );

  // Handle resize end / 리사이즈 종료 처리
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Setup resize event listeners / 리사이즈 이벤트 리스너 설정
  useEffect(() => {
    if (!isResizing) {
      // Reset pointer events when not resizing / 리사이즈 중이 아닐 때 포인터 이벤트 리셋
      if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = '';
      }
      return;
    }

    // Disable pointer events on iframe during resize to prevent event loss / 리사이즈 중 iframe의 포인터 이벤트 비활성화하여 이벤트 손실 방지
    if (iframeRef.current) {
      iframeRef.current.style.pointerEvents = 'none';
    }

    document.addEventListener('mousemove', handleResizeMove, { passive: false });
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      // Re-enable pointer events / 포인터 이벤트 재활성화
      if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = '';
      }
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Handle window resize / 윈도우 리사이즈 처리
  useEffect(() => {
    const handleWindowResize = () => {
      if (height > window.innerHeight) {
        updateHeight(window.innerHeight);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [height, updateHeight]);

  // Setup DevTools iframe / DevTools iframe 설정
  useEffect(() => {
    if (!iframeRef.current || !clientId) {
      previousClientIdRef.current = null;
      return;
    }

    // Only reload if clientId actually changed / clientId가 실제로 변경된 경우에만 다시 로드
    if (previousClientIdRef.current === clientId) {
      return;
    }

    previousClientIdRef.current = clientId;
    const serverUrl = getServerUrl();
    const devToolsUrl = buildDevToolsUrl(clientId, serverUrl);

    // Only set src if it's different to avoid unnecessary reloads / 불필요한 리로드를 방지하기 위해 다른 경우에만 src 설정
    if (iframeRef.current.src !== devToolsUrl) {
      iframeRef.current.src = devToolsUrl;
    }
  }, [clientId]);

  // Setup postMessage listener for client script / 클라이언트 스크립트를 위한 postMessage 리스너 설정
  useEffect(() => {
    if (!clientId) return;

    // Listen for CDP messages from client script (via postMessage) / 클라이언트 스크립트로부터 CDP 메시지 수신 (postMessage를 통해)
    const handleClientMessage = (event: MessageEvent<PostMessageData>) => {
      // Only accept messages from same origin / 같은 origin으로부터의 메시지만 수락
      if (event.origin !== window.location.origin) {
        return;
      }

      // Only accept CDP_MESSAGE type (ignore SET_DEBUG_ID and others) / CDP_MESSAGE 타입만 수락 (SET_DEBUG_ID 등은 무시)
      if (event.data?.type === 'CDP_MESSAGE') {
        // Forward CDP message from client to DevTools iframe / 클라이언트로부터 받은 CDP 메시지를 DevTools iframe에 전달
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(event.data, '*');
        }
      }
    };

    window.addEventListener('message', handleClientMessage);

    return () => {
      window.removeEventListener('message', handleClientMessage);
    };
  }, [clientId]);

  // Setup postMessage listener for DevTools iframe / DevTools iframe을 위한 postMessage 리스너 설정
  useEffect(() => {
    const handleMessage = (event: MessageEvent<PostMessageData>) => {
      // Only accept messages from DevTools iframe / DevTools iframe으로부터의 메시지만 수락
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (event.data?.type === 'CDP_MESSAGE') {
        // Forward CDP message from DevTools to client script / DevTools로부터 받은 CDP 메시지를 클라이언트 스크립트에 전달
        const cdpClient = (window as any).__cdpClient;
        if (cdpClient && typeof cdpClient.execute === 'function') {
          try {
            const message = JSON.parse(event.data.message);
            const result = cdpClient.execute(message);

            // If result has id, send response back to DevTools / result에 id가 있으면 DevTools에 응답 전송
            if (result && typeof result === 'object' && 'id' in result) {
              if (iframeRef.current?.contentWindow) {
                const responseMessage: CDPMessage = {
                  type: 'CDP_MESSAGE',
                  message: JSON.stringify(result),
                };
                iframeRef.current.contentWindow.postMessage(responseMessage, '*');
              }
            }
          } catch (error) {
            console.error('Failed to execute CDP message / CDP 메시지 실행 실패:', error);
          }
        }
      } else if (event.data?.type === 'DEVTOOLS_READY') {
        console.log('DevTools ready / DevTools 준비 완료');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Show loading state if no clientId / clientId가 없으면 로딩 상태 표시
  if (!clientId) {
    return (
      <div
        className="fixed left-0 bottom-0 w-full z-[200000] border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-gray-600 dark:text-gray-400 text-sm text-center">
          Waiting for client connection... / 클라이언트 연결 대기 중...
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 bottom-0 w-full z-[200000] border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col"
      style={{ height: `${height}px` }}
    >
      <div
        ref={draggableRef}
        className="absolute w-full h-[18px] left-0 -top-2 cursor-row-resize z-10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 py-1 -my-1"
        onMouseDown={handleResizeStart}
      />
      <iframe ref={iframeRef} className="border-none w-full h-full flex-1" title="DevTools" />
    </div>
  );
}
