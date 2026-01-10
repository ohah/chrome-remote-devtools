// Redux DevTools page / Redux DevTools 페이지
// Uses Redux DevTools plugin / Redux DevTools 플러그인 사용

import { ReduxDevToolsPanel } from '@ohah/redux-devtools-plugin/ui';
import { getServerUrl } from '@/shared/lib/server-url';

// Redux DevTools port (using /redux endpoint on main server) / Redux DevTools 포트 (메인 서버의 /redux 엔드포인트 사용)
const REDUX_DEVTOOLS_PORT = 8080; // Same as main server / 메인 서버와 동일

export function ReduxDevToolsPage() {
  const serverUrl = getServerUrl();
  const serverHost = serverUrl ? new URL(serverUrl).hostname : 'localhost';
  const serverPort = serverUrl
    ? parseInt(new URL(serverUrl).port) || REDUX_DEVTOOLS_PORT
    : REDUX_DEVTOOLS_PORT;

  return <ReduxDevToolsPanel hostname={serverHost} port={serverPort} secure={false} />;
}

// Export component for route / 라우트용 컴포넌트 export
export { ReduxDevToolsPage as component };
