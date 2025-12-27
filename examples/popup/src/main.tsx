import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { init } from '@ohah/chrome-remote-devtools-client';
import './index.css';
import App from './App.tsx';

// Initialize Chrome Remote DevTools / Chrome Remote DevTools 초기화
// Popup mode uses postMessage (no serverUrl needed) / 팝업 모드는 postMessage 사용 (serverUrl 불필요)
// Session replay is enabled in popup mode / 팝업 모드에서는 세션 리플레이 활성화
init({
  skipWebSocket: true,
  rrweb: {
    enable: true,
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
