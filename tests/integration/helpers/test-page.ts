// Test page helpers / 테스트 페이지 헬퍼
export function createTestPageHTML(content: string, serverUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <script src="${serverUrl}/client.js" data-server-url="${serverUrl}"></script>
</head>
<body>
  ${content}
</body>
</html>`;
}

export function createSimpleTestPage(serverUrl: string): string {
  return createTestPageHTML(
    `
    <h1>Test Page</h1>
    <button id="test-button">Click Me</button>
    <script>
      console.log('Page loaded');
      document.getElementById('test-button').addEventListener('click', () => {
        console.log('Button clicked');
      });
    </script>
  `,
    serverUrl
  );
}
