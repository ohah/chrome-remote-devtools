import { useRef } from "react";
import "./App.css";

function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Create inspector HTML content / inspector HTML 콘텐츠 생성
  const inspectorHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DevTools</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body {
        background-color: rgb(41 42 45);
      }
    }
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
  <meta http-equiv="Content-Security-Policy" content="object-src 'none'; script-src 'self' https://chrome-devtools-frontend.appspot.com">
  <meta name="referrer" content="no-referrer">
  <link href="/devtools-frontend/application_tokens.css" rel="stylesheet">
  <link href="/devtools-frontend/design_system_tokens.css" rel="stylesheet">
</head>
<body class="undocked" id="-blink-dev-tools">
  <!-- Use devtools_app.js instead of inspector.js (no screencast) / inspector.js 대신 devtools_app.js 사용 (screencast 없음) -->
  <script type="module" src="/devtools-frontend/entrypoints/devtools_app/devtools_app.js"></script>
</body>
</html>`;

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Your React UI / React UI */}
      <div style={{ padding: "10px", background: "#f0f0f0", borderBottom: "1px solid #ccc" }}>
        <h1>Chrome Remote DevTools</h1>
        {/* Add your controls here / 여기에 컨트롤 추가 */}
      </div>

      {/* DevTools iframe / DevTools iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={inspectorHTML}
        style={{
          flex: 1,
          width: "100%",
          border: "none",
        }}
        title="DevTools"
      />
    </div>
  );
}

export default App;
