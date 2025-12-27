import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { init } from '@ohah/chrome-remote-devtools-client';
import './index.css';
import App from './App.tsx';

// Initialize Chrome Remote DevTools / Chrome Remote DevTools 초기화
// Iframe mode uses postMessage (no serverUrl needed) / iframe 모드는 postMessage 사용 (serverUrl 불필요)
init({
  skipWebSocket: true,
  rrweb: {
    enable: false,
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
