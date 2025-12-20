import { useState, useEffect } from 'react';
import './StoragePage.css';

// Storage test page / Storage 테스트 페이지
function StoragePage() {
  const [localStorageItems, setLocalStorageItems] = useState<Array<[string, string]>>([]);
  const [sessionStorageItems, setSessionStorageItems] = useState<Array<[string, string]>>([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  // Load storage items / storage 항목 로드
  const loadStorage = () => {
    const local: Array<[string, string]> = [];
    const session: Array<[string, string]> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== null) {
        const v = localStorage.getItem(k);
        if (v !== null) {
          local.push([k, v]);
        }
      }
    }

    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k !== null) {
        const v = sessionStorage.getItem(k);
        if (v !== null) {
          session.push([k, v]);
        }
      }
    }

    setLocalStorageItems(local);
    setSessionStorageItems(session);
  };

  const handleSetLocalStorage = () => {
    if (key) {
      localStorage.setItem(key, value);
      loadStorage();
      setKey('');
      setValue('');
    }
  };

  const handleSetSessionStorage = () => {
    if (key) {
      sessionStorage.setItem(key, value);
      loadStorage();
      setKey('');
      setValue('');
    }
  };

  const handleRemoveLocalStorage = (k: string) => {
    localStorage.removeItem(k);
    loadStorage();
  };

  const handleRemoveSessionStorage = (k: string) => {
    sessionStorage.removeItem(k);
    loadStorage();
  };

  const handleClearLocalStorage = () => {
    localStorage.clear();
    loadStorage();
  };

  const handleClearSessionStorage = () => {
    sessionStorage.clear();
    loadStorage();
  };

  return (
    <div className="storage-page">
      <h1>Storage Test / Storage 테스트</h1>
      <p>
        Open DevTools Application tab to see storage / DevTools Application 탭을 열어 storage를
        확인하세요
      </p>

      <div className="storage-form">
        <h2>Add Item / 항목 추가</h2>
        <div className="form-group">
          <label>
            Key / 키:
            <input type="text" value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Value / 값:
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
        </div>
        <div className="form-buttons">
          <button onClick={handleSetLocalStorage}>Set localStorage</button>
          <button onClick={handleSetSessionStorage}>Set sessionStorage</button>
        </div>
      </div>

      <div className="storage-sections">
        <div className="storage-section">
          <div className="storage-header">
            <h2>localStorage</h2>
            <button onClick={handleClearLocalStorage} className="clear-button">
              Clear / 삭제
            </button>
          </div>
          {localStorageItems.length === 0 ? (
            <p className="empty">No items / 항목 없음</p>
          ) : (
            <ul className="storage-list">
              {localStorageItems.map(([k, v]) => (
                <li key={k}>
                  <span className="key">{k}:</span>
                  <span className="value">{v}</span>
                  <button onClick={() => handleRemoveLocalStorage(k)} className="remove-button">
                    Remove / 제거
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="storage-section">
          <div className="storage-header">
            <h2>sessionStorage</h2>
            <button onClick={handleClearSessionStorage} className="clear-button">
              Clear / 삭제
            </button>
          </div>
          {sessionStorageItems.length === 0 ? (
            <p className="empty">No items / 항목 없음</p>
          ) : (
            <ul className="storage-list">
              {sessionStorageItems.map(([k, v]) => (
                <li key={k}>
                  <span className="key">{k}:</span>
                  <span className="value">{v}</span>
                  <button onClick={() => handleRemoveSessionStorage(k)} className="remove-button">
                    Remove / 제거
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default StoragePage;
