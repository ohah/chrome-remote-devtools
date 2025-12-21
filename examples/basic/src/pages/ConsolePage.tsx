import { useEffect, useState } from 'react';

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
    <div className="p-8 text-center w-full box-border bg-gray-900 min-h-screen">
      <h1 className="mb-4 text-white text-4xl font-semibold">Console Test / 콘솔 테스트</h1>
      <p className="mb-8 text-gray-400 text-lg">
        Open DevTools to see console messages / DevTools를 열어 콘솔 메시지를 확인하세요
      </p>

      <div className="p-8 mb-8 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-lg">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="mb-4 bg-gray-700 text-white border border-gray-500 rounded-lg px-4 py-2 hover:bg-gray-600 transition-colors"
        >
          count is {count}
        </button>
        <p className="m-0 text-gray-300">
          This button updates count and logs to console / 이 버튼은 카운트를 업데이트하고 콘솔에
          로그를 남깁니다
        </p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={handleLog}
          className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
        >
          Log / 로그
        </button>
        <button
          onClick={handleWarn}
          className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
        >
          Warn / 경고
        </button>
        <button
          onClick={handleError}
          className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
        >
          Error / 에러
        </button>
        <button
          onClick={handleInfo}
          className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
        >
          Info / 정보
        </button>
        <button
          onClick={handleTable}
          className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
        >
          Table / 테이블
        </button>
        <button
          onClick={handleException}
          className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
        >
          Exception / 예외
        </button>
      </div>
    </div>
  );
}

export default ConsolePage;
