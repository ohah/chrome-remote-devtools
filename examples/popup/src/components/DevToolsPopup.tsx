// DevTools popup component / DevTools 팝업 컴포넌트
import { useState, useEffect, useRef } from 'react';
import { buildDevToolsUrl, getServerUrl } from '../utils/devtools';

interface DevToolsPopupProps {
  clientId: string | null;
}

export default function DevToolsPopup({ clientId }: DevToolsPopupProps) {
  const popupRef = useRef<Window | null>(null);
  const previousClientIdRef = useRef<string | null>(null);

  // Open or update DevTools popup / DevTools 팝업 열기 또는 업데이트
  useEffect(() => {
    if (!clientId) {
      // Close popup if clientId is lost / clientId가 없어지면 팝업 닫기
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
        popupRef.current = null;
      }
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

    // Open or update popup / 팝업 열기 또는 업데이트
    if (popupRef.current && !popupRef.current.closed) {
      // Popup already open, just update URL / 팝업이 이미 열려있으면 URL만 업데이트
      popupRef.current.location.href = devToolsUrl;
    } else {
      // Open new popup / 새 팝업 열기
      popupRef.current = window.open(
        devToolsUrl,
        'devtools',
        'width=1200,height=800,resizable=yes,scrollbars=yes'
      );
    }
  }, [clientId]);

  // Cleanup on unmount / 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  const handleOpenPopup = () => {
    if (!clientId) {
      alert(
        'Not connected. Please wait for client connection. / 연결되지 않았습니다. 클라이언트 연결을 기다려주세요.'
      );
      return;
    }

    const serverUrl = getServerUrl();
    const devToolsUrl = buildDevToolsUrl(clientId, serverUrl);

    if (popupRef.current && !popupRef.current.closed) {
      // Focus existing popup / 기존 팝업 포커스
      popupRef.current.focus();
    } else {
      // Open new popup / 새 팝업 열기
      popupRef.current = window.open(
        devToolsUrl,
        'devtools',
        'width=1200,height=800,resizable=yes,scrollbars=yes'
      );
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleOpenPopup}
        disabled={!clientId}
        className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
      >
        {clientId ? 'Open DevTools / DevTools 열기' : 'Waiting for connection... / 연결 대기 중...'}
      </button>
    </div>
  );
}
