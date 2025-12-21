import { useState } from 'react';

// Network test page / 네트워크 테스트 페이지
function NetworkPage() {
  const [fetchResult, setFetchResult] = useState<string>('');
  const [xhrResult, setXhrResult] = useState<string>('');

  const handleFetch = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();
      setFetchResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setFetchResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleFetchPost = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Post',
          body: 'This is a test post',
          userId: 1,
        }),
      });
      const data = await response.json();
      setFetchResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setFetchResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleXhr = () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/posts/2');
    xhr.onload = () => {
      if (xhr.status === 200) {
        setXhrResult(JSON.stringify(JSON.parse(xhr.responseText), null, 2));
      } else {
        setXhrResult(`Error: ${xhr.status} ${xhr.statusText}`);
      }
    };
    xhr.onerror = () => {
      setXhrResult('Network error / 네트워크 에러');
    };
    xhr.send();
  };

  const handleXhrPost = () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://jsonplaceholder.typicode.com/posts');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        setXhrResult(JSON.stringify(JSON.parse(xhr.responseText), null, 2));
      } else {
        setXhrResult(`Error: ${xhr.status} ${xhr.statusText}`);
      }
    };
    xhr.onerror = () => {
      setXhrResult('Network error / 네트워크 에러');
    };
    xhr.send(
      JSON.stringify({
        title: 'Test Post',
        body: 'This is a test post',
        userId: 1,
      })
    );
  };

  return (
    <div className="p-8 w-full max-w-none m-0 box-border bg-gray-900 min-h-screen">
      <h1 className="text-center mb-4 text-white text-4xl font-semibold">
        Network Test / 네트워크 테스트
      </h1>
      <p className="text-center mb-8 text-gray-400 text-lg">
        Open DevTools Network tab to see requests / DevTools Network 탭을 열어 요청을 확인하세요
      </p>

      <div className="mb-12 p-8 border border-gray-600 rounded-lg bg-gray-800 shadow-lg">
        <h2 className="mt-0 mb-6 text-blue-400 text-2xl font-semibold">Fetch API / Fetch API</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={handleFetch}
            className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
          >
            GET Request / GET 요청
          </button>
          <button
            onClick={handleFetchPost}
            className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
          >
            POST Request / POST 요청
          </button>
        </div>
        {fetchResult && (
          <div className="mt-4 p-4 bg-gray-700 rounded border border-gray-600 text-white">
            <h3 className="mt-0 mb-2 text-white">Response / 응답:</h3>
            <pre className="m-0 overflow-x-auto text-sm text-gray-300">{fetchResult}</pre>
          </div>
        )}
      </div>

      <div className="mb-12 p-8 border border-gray-600 rounded-lg bg-gray-800 shadow-lg">
        <h2 className="mt-0 mb-6 text-blue-400 text-2xl font-semibold">
          XMLHttpRequest / XMLHttpRequest
        </h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={handleXhr}
            className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
          >
            GET Request / GET 요청
          </button>
          <button
            onClick={handleXhrPost}
            className="px-7 py-3.5 text-base font-medium border-2 border-blue-500 rounded-md bg-transparent text-blue-500 cursor-pointer transition-all hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(100,108,255,0.3)]"
          >
            POST Request / POST 요청
          </button>
        </div>
        {xhrResult && (
          <div className="mt-4 p-4 bg-gray-700 rounded border border-gray-600 text-white">
            <h3 className="mt-0 mb-2 text-white">Response / 응답:</h3>
            <pre className="m-0 overflow-x-auto text-sm text-gray-300">{xhrResult}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default NetworkPage;
