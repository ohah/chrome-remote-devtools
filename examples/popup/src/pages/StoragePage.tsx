import { useState, useEffect } from 'react';

// Storage test page / Storage 테스트 페이지
export default function StoragePage() {
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

  useEffect(() => {
    loadStorage();
    // Reload when storage changes / storage 변경 시 다시 로드
    const interval = setInterval(loadStorage, 500);
    return () => clearInterval(interval);
  }, []);

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
    <div className="p-8 w-full min-h-screen bg-gray-900 box-border flex flex-col flex-wrap m-0 max-w-none relative">
      <h1 className="text-center mb-4 text-white text-4xl font-semibold">
        Storage Test / Storage 테스트
      </h1>
      <p className="text-center mb-8 text-gray-400 text-lg">
        Open DevTools Application tab to see storage / DevTools Application 탭을 열어 storage를
        확인하세요
      </p>

      <div className="mb-8 p-8 border border-gray-600 rounded-lg bg-gray-800 shadow-lg">
        <h2 className="mt-0 mb-6 text-blue-400 text-2xl font-semibold">Add Item / 항목 추가</h2>
        <div className="mb-4">
          <label className="block mb-3 font-medium text-white text-base">
            Key / 키:
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full p-3 text-base border border-gray-500 rounded bg-gray-700 text-white box-border focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
            />
          </label>
        </div>
        <div className="mb-4">
          <label className="block mb-3 font-medium text-white text-base">
            Value / 값:
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-3 text-base border border-gray-500 rounded bg-gray-700 text-white box-border focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
            />
          </label>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleSetLocalStorage}
            className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
          >
            Set localStorage
          </button>
          <button
            onClick={handleSetSessionStorage}
            className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
          >
            Set sessionStorage
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(450px,1fr))] gap-8 w-full">
        <div className="p-8 border border-gray-600 rounded-lg bg-gray-800 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="m-0 text-blue-400 text-2xl font-semibold">localStorage</h2>
            <button
              onClick={handleClearLocalStorage}
              className="px-5 py-2.5 text-sm font-medium border-2 border-red-500 rounded-md bg-transparent text-red-500 cursor-pointer transition-all hover:bg-red-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,68,68,0.3)]"
            >
              Clear / 삭제
            </button>
          </div>
          {localStorageItems.length === 0 ? (
            <p className="text-gray-400 text-center py-12 text-lg">No items / 항목 없음</p>
          ) : (
            <ul className="list-none p-0 m-0">
              {localStorageItems.map(([k, v]) => (
                <li
                  key={k}
                  className="flex items-center gap-4 p-4 border-b border-gray-600 transition-colors hover:bg-gray-700 last:border-b-0"
                >
                  <span className="font-semibold min-w-[120px] text-white text-base">{k}:</span>
                  <span className="flex-1 text-gray-300 break-all text-sm">{v}</span>
                  <button
                    onClick={() => handleRemoveLocalStorage(k)}
                    className="px-4 py-2 text-sm font-medium border-2 border-red-500 rounded-md bg-transparent text-red-500 cursor-pointer transition-all hover:bg-red-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,68,68,0.3)] whitespace-nowrap"
                  >
                    Remove / 제거
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-8 border border-gray-600 rounded-lg bg-gray-800 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="m-0 text-blue-400 text-2xl font-semibold">sessionStorage</h2>
            <button
              onClick={handleClearSessionStorage}
              className="px-5 py-2.5 text-sm font-medium border-2 border-red-500 rounded-md bg-transparent text-red-500 cursor-pointer transition-all hover:bg-red-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,68,68,0.3)]"
            >
              Clear / 삭제
            </button>
          </div>
          {sessionStorageItems.length === 0 ? (
            <p className="text-gray-400 text-center py-12 text-lg">No items / 항목 없음</p>
          ) : (
            <ul className="list-none p-0 m-0">
              {sessionStorageItems.map(([k, v]) => (
                <li
                  key={k}
                  className="flex items-center gap-4 p-4 border-b border-gray-600 transition-colors hover:bg-gray-700 last:border-b-0"
                >
                  <span className="font-semibold min-w-[120px] text-white text-base">{k}:</span>
                  <span className="flex-1 text-gray-300 break-all text-sm">{v}</span>
                  <button
                    onClick={() => handleRemoveSessionStorage(k)}
                    className="px-4 py-2 text-sm font-medium border-2 border-red-500 rounded-md bg-transparent text-red-500 cursor-pointer transition-all hover:bg-red-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,68,68,0.3)] whitespace-nowrap"
                  >
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
