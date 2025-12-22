// Main App component / 메인 App 컴포넌트
import { useState, useEffect } from 'react';
import DevToolsIframe from './components/DevToolsIframe';
import { getClientId } from './utils/devtools';

function App() {
  const [clientId, setClientId] = useState<string | null>(null);

  // Check for client ID periodically / 클라이언트 ID를 주기적으로 확인
  useEffect(() => {
    // Initial check / 초기 확인
    const id = getClientId();
    if (id) {
      setClientId(id);
      return;
    }

    // Poll for client ID (client script may load later) / 클라이언트 ID 폴링 (클라이언트 스크립트가 나중에 로드될 수 있음)
    // Client script creates debug_id when WebSocket connects / 클라이언트 스크립트는 WebSocket 연결 시 debug_id 생성
    const interval = setInterval(() => {
      const id = getClientId();
      if (id) {
        setClientId(id);
        clearInterval(interval);
      }
    }, 200);

    // Cleanup after 30 seconds / 30초 후 정리
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Test functions / 테스트 함수들
  const handleConsoleTest = () => {
    console.log('Console test message / 콘솔 테스트 메시지');
    console.warn('Console warning / 콘솔 경고');
    console.error('Console error / 콘솔 에러');
  };

  const handleNetworkTest = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();
      console.log('Network test response / 네트워크 테스트 응답:', data);
    } catch (error) {
      console.error('Network test error / 네트워크 테스트 에러:', error);
    }
  };

  const handleStorageTest = () => {
    localStorage.setItem('test-key', `test-value-${Date.now()}`);
    sessionStorage.setItem('test-session', `test-session-value-${Date.now()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-0 mb-0">
        <header className="p-8 text-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <h1 className="m-0 mb-2 text-3xl">Chrome Remote DevTools - iframe Example</h1>
          <p className="m-0 opacity-90">
            DevTools iframe example similar to chii / chii와 유사한 DevTools iframe 예제
          </p>
        </header>

        <main className="max-w-5xl mx-auto p-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-md dark:shadow-lg">
            <h2 className="m-0 mb-4 text-gray-900 dark:text-gray-100">
              Test Functions / 테스트 함수
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Use these buttons to test DevTools functionality / DevTools 기능을 테스트하려면 이
              버튼들을 사용하세요
            </p>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={handleConsoleTest}
                className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700"
              >
                Console Test / 콘솔 테스트
              </button>
              <button
                onClick={handleNetworkTest}
                className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700"
              >
                Network Test / 네트워크 테스트
              </button>
              <button
                onClick={handleStorageTest}
                className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700"
              >
                Storage Test / 스토리지 테스트
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-md dark:shadow-lg">
            <h2 className="m-0 mb-4 text-gray-900 dark:text-gray-100">About / 정보</h2>
            <ul className="list-none p-0 m-0">
              <li className="py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                <strong className="text-indigo-500">Client ID:</strong>{' '}
                {clientId || 'Not connected / 연결되지 않음'}
              </li>
              <li className="py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                <strong className="text-indigo-500">DevTools:</strong> Displayed in iframe at the
                bottom / 하단의 iframe에 표시됨
              </li>
              <li className="py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                <strong className="text-indigo-500">Resize:</strong> Drag the handle at the top of
                DevTools panel / DevTools 패널 상단의 핸들을 드래그하여 크기 조절
              </li>
            </ul>
          </div>
        </main>
      </div>

      {/* DevTools iframe / DevTools iframe */}
      <DevToolsIframe clientId={clientId} />
    </div>
  );
}

export default App;
