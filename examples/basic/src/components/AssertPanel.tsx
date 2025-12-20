import { useState, useEffect } from 'react';
import { assertManager, type AssertResult } from '../utils/assert';
import './AssertPanel.css';

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
    <div className={`assert-panel ${isOpen ? 'open' : ''}`}>
      <button className="assert-panel-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="assert-panel-title">
          Assert Results / Assert 결과: {passedCount} / {totalCount} passed / 통과
        </span>
        {failedCount > 0 && (
          <span className="assert-panel-failed">{failedCount} failed / 실패</span>
        )}
        <span className="assert-panel-arrow">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="assert-panel-content">
          <div className="assert-panel-header">
            <button onClick={() => assertManager.clearResults()} className="assert-panel-clear">
              Clear / 지우기
            </button>
          </div>
          <div className="assert-panel-results">
            {results.map((result) => (
              <div
                key={result.id}
                className={`assert-result ${result.passed ? 'passed' : 'failed'}`}
              >
                <div className="assert-result-header">
                  <span className="assert-result-icon">{result.passed ? '✓' : '✗'}</span>
                  <span className="assert-result-name">{result.name}</span>
                </div>
                {result.message && <div className="assert-result-message">{result.message}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AssertPanel;
