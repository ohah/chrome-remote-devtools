import { useState, useEffect } from 'react';
import { assertManager, type AssertResult } from '../utils/assert';

// Assert panel component / Assert 패널 컴포넌트
function AssertPanel() {
  const [results, setResults] = useState<AssertResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Subscribe to assert results / assert 결과 구독
    const unsubscribe = assertManager.subscribe((newResults) => {
      setResults(newResults);
    });

    // Load initial results / 초기 결과 로드
    setResults(assertManager.getResults());

    return unsubscribe;
  }, []);

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalCount = results.length;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t-2 border-gray-600 shadow-[0_-2px_10px_rgba(0,0,0,0.5)] z-[1000] max-h-[50vh] flex flex-col">
      <button
        className="w-full px-4 py-3 bg-gray-800 border-none border-b border-gray-600 cursor-pointer flex items-center justify-between text-sm transition-colors text-white hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-white">
          Assert Results / Assert 결과: {passedCount} / {totalCount} passed / 통과
        </span>
        {failedCount > 0 && (
          <span className="text-red-500 font-semibold ml-4">{failedCount} failed / 실패</span>
        )}
        <span className="ml-auto text-gray-400">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col max-h-[calc(50vh-50px)] overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-600 flex justify-end bg-gray-800">
            <button
              onClick={() => assertManager.clearResults()}
              className="px-3 py-1 text-sm border border-gray-500 rounded bg-transparent text-gray-400 cursor-pointer transition-all hover:bg-gray-500 hover:text-white"
            >
              Clear / 지우기
            </button>
          </div>
          <div className="overflow-y-auto p-2 bg-gray-900">
            {results.map((result) => (
              <div
                key={result.id}
                className={`p-3 mb-2 rounded border-l-[3px] ${
                  result.passed
                    ? 'bg-green-900/30 border-l-green-500'
                    : 'bg-red-900/30 border-l-red-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-bold text-lg ${
                      result.passed ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <span className="font-medium text-sm text-white">{result.name}</span>
                </div>
                {result.message && (
                  <div className="mt-1 pl-6 text-xs text-gray-300 font-mono">{result.message}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AssertPanel;
