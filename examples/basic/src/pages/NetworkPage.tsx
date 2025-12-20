import { useState } from 'react';
import './NetworkPage.css';

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
    <div className="network-page">
      <h1>Network Test / 네트워크 테스트</h1>
      <p>
        Open DevTools Network tab to see requests / DevTools Network 탭을 열어 요청을 확인하세요
      </p>

      <div className="test-section">
        <h2>Fetch API / Fetch API</h2>
        <div className="test-buttons">
          <button onClick={handleFetch}>GET Request / GET 요청</button>
          <button onClick={handleFetchPost}>POST Request / POST 요청</button>
        </div>
        {fetchResult && (
          <div className="result">
            <h3>Response / 응답:</h3>
            <pre>{fetchResult}</pre>
          </div>
        )}
      </div>

      <div className="test-section">
        <h2>XMLHttpRequest / XMLHttpRequest</h2>
        <div className="test-buttons">
          <button onClick={handleXhr}>GET Request / GET 요청</button>
          <button onClick={handleXhrPost}>POST Request / POST 요청</button>
        </div>
        {xhrResult && (
          <div className="result">
            <h3>Response / 응답:</h3>
            <pre>{xhrResult}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default NetworkPage;
