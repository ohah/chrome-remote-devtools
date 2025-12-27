// Test page utilities for E2E tests / E2E 테스트용 테스트 페이지 유틸리티

/**
 * Generate HTML page with client script / 클라이언트 스크립트가 포함된 HTML 페이지 생성
 */
export function generateTestPage(serverUrl: string): string {
  const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <script src="${serverUrl}/client.js"></script>
  <script>
    ChromeRemoteDevTools.init({
      serverUrl: '${wsUrl}',
    });
  </script>
</head>
<body>
  <h1>Test Page</h1>
  <script>
    // Generate console messages / 콘솔 메시지 생성
    console.log('Test log message');
    console.warn('Test warning message');
    console.error('Test error message');
  </script>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML page with network requests / 네트워크 요청이 있는 HTML 페이지 생성
 */
export function generateNetworkTestPage(serverUrl: string): string {
  const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Network Test Page</title>
  <script src="${serverUrl}/client.js"></script>
  <script>
    ChromeRemoteDevTools.init({
      serverUrl: '${wsUrl}',
    });
  </script>
</head>
<body>
  <h1>Network Test Page</h1>
  <script>
    // Make network requests / 네트워크 요청 생성
    fetch('/api/test').catch(() => {});
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/test2');
    xhr.send();
  </script>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML page with DOM manipulation / DOM 조작이 있는 HTML 페이지 생성
 */
export function generateDOMTestPage(serverUrl: string): string {
  const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return `
<!DOCTYPE html>
<html>
<head>
  <title>DOM Test Page</title>
  <script src="${serverUrl}/client.js"></script>
  <script>
    ChromeRemoteDevTools.init({
      serverUrl: '${wsUrl}',
    });
  </script>
</head>
<body>
  <h1>DOM Test Page</h1>
  <div id="test-div">Test Content</div>
  <script>
    // DOM manipulation / DOM 조작
    setTimeout(() => {
      const div = document.getElementById('test-div');
      if (div) {
        div.textContent = 'Updated Content';
        div.setAttribute('data-test', 'value');
      }
    }, 100);
  </script>
</body>
</html>
  `.trim();
}
