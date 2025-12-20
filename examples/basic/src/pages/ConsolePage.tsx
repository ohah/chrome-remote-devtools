import { useEffect, useState } from 'react';
import './ConsolePage.css';

// Console test page / 콘솔 테스트 페이지
function ConsolePage() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('count', count);
  }, [count]);

  const handleLog = () => {
    console.log('Log message / 로그 메시지');
  };

  const handleWarn = () => {
    console.warn('Warning message / 경고 메시지');
  };

  const handleError = () => {
    console.error('Error message / 에러 메시지');
  };

  const handleInfo = () => {
    console.info('Info message / 정보 메시지');
  };

  const handleTable = () => {
    console.table([
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 35 },
    ]);
  };

  const handleException = () => {
    try {
      throw new Error('Test exception / 테스트 예외');
    } catch (e) {
      console.error('Caught exception / 예외 캐치:', e);
    }
  };

  return (
    <div className="console-page">
      <h1>Console Test / 콘솔 테스트</h1>
      <p>Open DevTools to see console messages / DevTools를 열어 콘솔 메시지를 확인하세요</p>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          This button updates count and logs to console / 이 버튼은 카운트를 업데이트하고 콘솔에
          로그를 남깁니다
        </p>
      </div>

      <div className="test-buttons">
        <button onClick={handleLog}>Log / 로그</button>
        <button onClick={handleWarn}>Warn / 경고</button>
        <button onClick={handleError}>Error / 에러</button>
        <button onClick={handleInfo}>Info / 정보</button>
        <button onClick={handleTable}>Table / 테이블</button>
        <button onClick={handleException}>Exception / 예외</button>
      </div>
    </div>
  );
}

export default ConsolePage;
