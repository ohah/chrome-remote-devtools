// Main App component / 메인 App 컴포넌트
import { useState, useEffect } from 'react';
import DevToolsIframe from './components/DevToolsIframe';
import { getClientId } from './utils/devtools';
import './App.css';

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
    localStorage.setItem('test-key', 'test-value');
    sessionStorage.setItem('test-session', 'test-session-value');
    console.log('Storage test / 스토리지 테스트:', {
      localStorage: localStorage.getItem('test-key'),
      sessionStorage: sessionStorage.getItem('test-session'),
    });
  };

  return (
    <div className="app">
      <div className="app-content">
        <header className="app-header">
          <h1>Chrome Remote DevTools - iframe Example</h1>
          <p>DevTools iframe example similar to chii / chii와 유사한 DevTools iframe 예제</p>
        </header>

        <main className="app-main">
          <div className="test-section">
            <h2>Test Functions / 테스트 함수</h2>
            <p>
              Use these buttons to test DevTools functionality / DevTools 기능을 테스트하려면 이
              버튼들을 사용하세요
            </p>

            <div className="test-buttons">
              <button onClick={handleConsoleTest} className="test-button">
                Console Test / 콘솔 테스트
              </button>
              <button onClick={handleNetworkTest} className="test-button">
                Network Test / 네트워크 테스트
              </button>
              <button onClick={handleStorageTest} className="test-button">
                Storage Test / 스토리지 테스트
              </button>
            </div>
          </div>

          <div className="info-section">
            <h2>About / 정보</h2>
            <ul>
              <li>
                <strong>Client ID:</strong> {clientId || 'Not connected / 연결되지 않음'}
              </li>
              <li>
                <strong>DevTools:</strong> Displayed in iframe at the bottom / 하단의 iframe에
                표시됨
              </li>
              <li>
                <strong>Resize:</strong> Drag the handle at the top of DevTools panel / DevTools
                패널 상단의 핸들을 드래그하여 크기 조절
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
