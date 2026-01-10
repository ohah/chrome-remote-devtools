// Plugin entry point for devtools-frontend iframe / devtools-frontend iframe용 플러그인 엔트리 포인트
// This file is bundled with all dependencies for the plugin / 이 파일은 플러그인용으로 모든 의존성과 함께 번들링됨

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReduxDevToolsPanel } from './panel';

// Auto-render when loaded / 로드 시 자동 렌더링
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(React.createElement(ReduxDevToolsPanel));
} else {
  console.error('Redux DevTools: root element not found');
}
