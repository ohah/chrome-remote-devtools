import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { init } from '@ohah/chrome-remote-devtools-client';
import './index.css';
import App from './App.tsx';

// Initialize Chrome Remote DevTools / Chrome Remote DevTools 초기화
init({
  serverUrl: 'ws://localhost:8080',
  rrweb: {
    enable: true,
    enableExportButton: true,
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
