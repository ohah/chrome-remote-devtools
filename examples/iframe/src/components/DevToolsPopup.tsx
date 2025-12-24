// DevTools popup component / DevTools 팝업 컴포넌트
import { useEffect, useRef } from 'react';
import { buildDevToolsUrl, getServerUrl } from '../utils/devtools';

interface DevToolsPopupProps {
  clientId: string | null;
  onClose?: () => void;
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

export default function DevToolsPopup({ clientId, onClose }: DevToolsPopupProps) {
  const popupRef = useRef<Window | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Open DevTools in popup window / 팝업 창에서 DevTools 열기
  useEffect(() => {
    if (!clientId) {
      // Close popup if clientId is lost / clientId가 없어지면 팝업 닫기
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
        popupRef.current = null;
      }
      return;
    }

    // Check if popup is already open / 팝업이 이미 열려있는지 확인
    if (popupRef.current && !popupRef.current.closed) {
      return;
    }

    const serverUrl = getServerUrl();
    const devToolsUrl = buildDevToolsUrl(clientId, serverUrl);

    // Open popup window / 팝업 창 열기
    const popup = window.open(
      devToolsUrl,
      'DevTools',
      'width=1200,height=800,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
      console.error('Failed to open popup window / 팝업 창 열기 실패');
      return;
    }

    popupRef.current = popup;

    // Setup WebSocket connection to server / 서버와의 WebSocket 연결 설정
    const protocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = new URL(serverUrl).hostname;
    const port = new URL(serverUrl).port || (serverUrl.startsWith('https') ? '443' : '80');
    const devtoolsId = `devtools-${clientId}`;
    const wsUrl = `${protocol}//${host}:${port}/remote/debug/devtools/${devtoolsId}?clientId=${clientId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Popup WebSocket connected / 팝업 WebSocket 연결됨');
    };

    ws.onmessage = (event) => {
      // Forward CDP message from server to DevTools popup / 서버로부터 받은 CDP 메시지를 DevTools 팝업에 전달
      if (popup && !popup.closed) {
        const cdpMessage: CDPMessage = { type: 'CDP_MESSAGE', message: event.data };
        popup.postMessage(cdpMessage, '*');
      }
    };

    ws.onerror = (error) => {
      console.error('Popup WebSocket error / 팝업 WebSocket 오류:', error);
    };

    ws.onclose = () => {
      console.log('Popup WebSocket disconnected / 팝업 WebSocket 연결 끊김');
    };

    // Setup postMessage listener for DevTools popup / DevTools 팝업을 위한 postMessage 리스너 설정
    const handleMessage = (event: MessageEvent<PostMessageData>) => {
      // Only accept messages from DevTools popup / DevTools 팝업으로부터의 메시지만 수락
      if (event.source !== popup) {
        return;
      }

      if (event.data?.type === 'CDP_MESSAGE') {
        // Forward CDP message from DevTools to server / DevTools로부터 받은 CDP 메시지를 서버에 전달
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(event.data.message);
        }
      } else if (event.data?.type === 'DEVTOOLS_READY') {
        console.log('DevTools popup ready / DevTools 팝업 준비 완료');
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup is closed / 팝업이 닫혔는지 확인
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        window.removeEventListener('message', handleMessage);
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        popupRef.current = null;
        wsRef.current = null;
        if (onClose) {
          onClose();
        }
      }
    }, 500);

    return () => {
      clearInterval(checkPopupClosed);
      window.removeEventListener('message', handleMessage);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      if (popup && !popup.closed) {
        popup.close();
      }
      popupRef.current = null;
      wsRef.current = null;
    };
  }, [clientId, onClose]);

  // This component doesn't render anything / 이 컴포넌트는 아무것도 렌더링하지 않음
  return null;
}

