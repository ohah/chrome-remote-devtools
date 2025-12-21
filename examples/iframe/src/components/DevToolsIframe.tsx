// DevTools iframe component / DevTools iframe 컴포넌트
import { useEffect, useRef, useState, useCallback } from 'react';
import { buildDevToolsUrl, getServerUrl } from '../utils/devtools';
import './DevToolsIframe.css';

interface DevToolsIframeProps {
  clientId: string | null;
}

export default function DevToolsIframe({ clientId }: DevToolsIframeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Show loading state if no clientId / clientId가 없으면 로딩 상태 표시
  if (!clientId) {
    return (
      <div
        className="devtools-iframe-container devtools-iframe-loading"
        style={{ height: `${height}px` }}
      >
        <div className="devtools-iframe-loading-message">
          Waiting for client connection... / 클라이언트 연결 대기 중...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="devtools-iframe-container" style={{ height: `${height}px` }}>
      <div
        ref={draggableRef}
        className="devtools-iframe-draggable"
        onMouseDown={handleResizeStart}
      />
      <iframe ref={iframeRef} className="devtools-iframe" title="DevTools" />
    </div>
  );
}
