#!/usr/bin/env node
/**
 * Build Redux DevTools Extension and copy to devtools-frontend / Redux DevTools Extension 빌드 및 devtools-frontend로 복사
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const extensionDir = path.join(rootDir, 'reference', 'redux-devtools', 'extension');
const targetDir = path.join(
  rootDir,
  'devtools',
  'devtools-frontend',
  'front_end',
  'panels',
  'redux',
  'extension'
);

console.log('🔨 Building Redux DevTools Extension...');
console.log('');

// 1. Build extension / Extension 빌드
console.log('📦 Step 1: Building extension...');

try {
  const reduxDevToolsRoot = path.join(rootDir, 'reference', 'redux-devtools');

  // Install dependencies if needed / 필요시 의존성 설치
  if (!fs.existsSync(path.join(reduxDevToolsRoot, 'node_modules'))) {
    console.log('  Installing dependencies...');
    execSync('pnpm install', { stdio: 'inherit', cwd: reduxDevToolsRoot, shell: true });
  }

  // Build all packages first / 먼저 모든 패키지 빌드
  console.log('  Building packages...');
  execSync('pnpm run build:all', { stdio: 'inherit', cwd: reduxDevToolsRoot, shell: true });

  // Build extension / Extension 빌드
  execSync('pnpm run build:extension', { stdio: 'inherit', cwd: extensionDir, shell: true });
  console.log('  ✓ Extension built successfully');
} catch (error) {
  console.error('  ✗ Failed to build extension:', error.message);
  process.exit(1);
}

console.log('');

// 2. Copy built files to devtools-frontend / 빌드된 파일을 devtools-frontend로 복사
console.log('📋 Step 2: Copying built files to devtools-frontend...');

const distDir = path.join(extensionDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('  ✗ dist directory not found');
  process.exit(1);
}

// Create target directory / 대상 디렉토리 생성
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy required files / 필요한 파일 복사
const filesToCopy = [
  'devpanel.html',
  'devpanel.bundle.js',
  'devpanel.bundle.css',
  'background.bundle.js',
  'content.bundle.js',
  'page.bundle.js',
];

const dirsToCopy = ['img'];

// Copy files / 파일 복사
for (const file of filesToCopy) {
  const src = path.join(distDir, file);
  const dest = path.join(targetDir, file);

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${file}`);
  } else {
    console.warn(`  ⚠ ${file} not found, skipping...`);
  }
}

// Copy directories / 디렉토리 복사
for (const dir of dirsToCopy) {
  const src = path.join(distDir, dir);
  const dest = path.join(targetDir, dir);

  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`  ✓ Copied ${dir}/`);
  } else {
    console.warn(`  ⚠ ${dir}/ not found, skipping...`);
  }
}

console.log('');

// 3. Fix paths and inject API stub in devpanel.html / devpanel.html의 경로 수정 및 API stub 주입
console.log('🔧 Step 3: Fixing paths and injecting API stub in devpanel.html...');
const devpanelHtmlPath = path.join(targetDir, 'devpanel.html');
if (fs.existsSync(devpanelHtmlPath)) {
  let htmlContent = fs.readFileSync(devpanelHtmlPath, 'utf-8');

  // Replace absolute paths with relative paths / 절대 경로를 상대 경로로 변경
  htmlContent = htmlContent.replace(/src="\/img\//g, 'src="img/');
  htmlContent = htmlContent.replace(
    /href="\/devpanel\.bundle\.css"/g,
    'href="devpanel.bundle.css"'
  );
  htmlContent = htmlContent.replace(/src="\/devpanel\.bundle\.js"/g, 'src="devpanel.bundle.js"');

  // Check if API init script is already injected / API init 스크립트가 이미 주입되었는지 확인
  if (htmlContent.includes('window.chrome.runtime')) {
    console.log('  ⚠ API stub already exists, skipping injection...');
  } else {
    // Inject API initialization script before other scripts / 다른 스크립트 전에 API 초기화 스크립트 주입
    // This ensures chrome API is available before devpanel.bundle.js executes / devpanel.bundle.js 실행 전에 chrome API가 사용 가능하도록 함
    const apiInitScript = `<script>
// Initialize chrome API stub before other scripts / 다른 스크립트 전에 chrome API stub 초기화
(function() {
  if (typeof window.chrome === 'undefined') {
    window.chrome = {};
  }
  // The actual API will be injected by ReduxExtensionBridge / 실제 API는 ReduxExtensionBridge에서 주입됨
  // This stub prevents "Cannot read properties of undefined" errors / 이 stub은 "Cannot read properties of undefined" 에러를 방지함
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      connect: function(options) {
        var name = (options && options.name) || 'default';
        return {
          name: name,
          onMessage: { addListener: function() {}, removeListener: function() {} },
          onDisconnect: { addListener: function() {} },
          postMessage: function() {},
          disconnect: function() {}
        };
      },
      sendMessage: function(message, callback) {
        if (callback) callback({ success: true });
      },
      onMessage: { addListener: function() {}, removeListener: function() {} },
      onConnect: { addListener: function() {} },
      getURL: function(path) {
        return 'devtools://devtools/bundled/panels/redux/extension/' + path;
      }
    };
  }
  if (!window.chrome.devtools) {
    window.chrome.devtools = {
      inspectedWindow: {
        eval: function(expression, callback) {
          if (callback) callback(null, { isException: true, value: 'Not initialized' });
        },
        getResources: function(callback) {
          if (callback) callback([{ url: window.location.href || 'about:blank' }]);
        },
        get tabId() { return undefined; }
      }
    };
  }
})();
</script>`;

    // Try multiple insertion strategies / 여러 삽입 전략 시도
    let inserted = false;

    // Strategy 1: Insert before first <script> tag (most reliable) / 첫 번째 <script> 태그 전에 삽입 (가장 안전)
    if (htmlContent.includes('<script')) {
      htmlContent = htmlContent.replace(/<script/i, apiInitScript + '<script');
      inserted = true;
      console.log('  ✓ Inserted API stub before first <script> tag');
    }
    // Strategy 2: Insert before </head> tag / </head> 태그 전에 삽입
    else if (htmlContent.includes('</head>')) {
      // Use lastIndexOf to find the last </head> tag / 마지막 </head> 태그 찾기
      const lastHeadIndex = htmlContent.lastIndexOf('</head>');
      if (lastHeadIndex !== -1) {
        htmlContent =
          htmlContent.slice(0, lastHeadIndex) + apiInitScript + htmlContent.slice(lastHeadIndex);
        inserted = true;
        console.log('  ✓ Inserted API stub before </head> tag');
      }
    }
    // Strategy 3: Insert before <body> tag / <body> 태그 전에 삽입
    else if (htmlContent.includes('<body>')) {
      htmlContent = htmlContent.replace('<body>', apiInitScript + '<body>');
      inserted = true;
      console.log('  ✓ Inserted API stub before <body> tag');
    }
    // Strategy 4: Insert at the beginning / 시작 부분에 삽입
    else {
      htmlContent = apiInitScript + htmlContent;
      inserted = true;
      console.log('  ✓ Inserted API stub at the beginning');
    }

    if (!inserted) {
      console.warn('  ⚠ Could not find insertion point, appending to end');
      htmlContent = htmlContent + apiInitScript;
    }
  }

  fs.writeFileSync(devpanelHtmlPath, htmlContent, 'utf-8');
  console.log('  ✓ Fixed paths and injected API stub in devpanel.html');
} else {
  console.warn('  ⚠ devpanel.html not found, skipping path fix...');
}

console.log('');
console.log('✅ Redux DevTools Extension built and copied successfully!');
console.log(`   Target: ${targetDir}`);
