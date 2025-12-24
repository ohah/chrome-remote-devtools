// DevTools page / 데브툴 페이지
import { useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';

// Export component for route / 라우트용 컴포넌트 export
export { DevToolsPage as component };

// Message types for postMessage communication / postMessage 통신을 위한 메시지 타입
interface CDPMessage {
  type: 'CDP_MESSAGE';
  message: string;
}

interface DevToolsReadyMessage {
  type: 'DEVTOOLS_READY';
}

type PostMessageData = CDPMessage | DevToolsReadyMessage;

function DevToolsPage() {
  // Get clientId from route params / 라우트 파라미터에서 clientId 가져오기
  const { clientId } = useParams({ from: '/devtools/$clientId' });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Setup DevTools iframe with postMessage mode / postMessage 모드로 DevTools iframe 설정
  useEffect(() => {
    if (!iframeRef.current || !clientId) return;

    const url = new URL('/devtools-frontend/devtools_app.html', window.location.origin);
    const params = url.searchParams;

    // Use postMessage instead of WebSocket / WebSocket 대신 postMessage 사용
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

    iframeRef.current.src = url.toString();
  }, [clientId]);

  // Setup WebSocket connection to server / 서버와의 WebSocket 연결 설정
  useEffect(() => {
    if (!clientId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8080';
    const devtoolsId = `devtools-${clientId}`;
    const wsUrl = `${protocol}//${host}:${port}/remote/debug/devtools/${devtoolsId}?clientId=${clientId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Inspector WebSocket connected / Inspector WebSocket 연결됨');
    };

    ws.onmessage = (event) => {
      // Forward CDP message from server to DevTools iframe / 서버로부터 받은 CDP 메시지를 DevTools iframe에 전달
      if (iframeRef.current?.contentWindow) {
        const cdpMessage: CDPMessage = { type: 'CDP_MESSAGE', message: event.data };
        iframeRef.current.contentWindow.postMessage(cdpMessage, '*');
      }
    };

    ws.onerror = (error) => {
      console.error('Inspector WebSocket error / Inspector WebSocket 오류:', error);
    };

    ws.onclose = () => {
      console.log('Inspector WebSocket disconnected / Inspector WebSocket 연결 끊김');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
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
        // Forward CDP message from DevTools to server / DevTools로부터 받은 CDP 메시지를 서버에 전달
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data.message);
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

  return (
    <div className="w-full h-screen">
        {/* DevTools iframe / DevTools iframe */}
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none"
          title="DevTools"
        />
    </div>
  );
}

