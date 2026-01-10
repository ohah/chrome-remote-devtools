// Vite build configuration for Redux DevTools plugin / Redux DevTools 플러그인용 Vite 빌드 설정
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } from 'fs';

// Plugin to copy built files and generate HTML for devtools-frontend / devtools-frontend용 빌드 파일 복사 및 HTML 생성 플러그인
function copyPluginToDevtoolsFrontend() {
  return {
    name: 'copy-plugin-to-devtools-frontend',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const pluginDir = resolve(
        __dirname,
        '../../devtools/devtools-frontend/front_end/panels/plugins/redux-plugin'
      );

      // Ensure directory exists / 디렉토리 존재 확인
      mkdirSync(pluginDir, { recursive: true });

      // Copy plugin bundle (if plugin build) or ui/index.js (if library build) / 플러그인 번들 복사 (플러그인 빌드) 또는 ui/index.js 복사 (라이브러리 빌드)
      const pluginBundlePath = resolve(distDir, 'plugin/plugin.js');
      const uiIndexPath = resolve(distDir, 'ui/index.js');

      if (existsSync(pluginBundlePath)) {
        // Plugin build: copy bundled file / 플러그인 빌드: 번들 파일 복사
        copyFileSync(pluginBundlePath, resolve(pluginDir, 'plugin.js'));
        console.log(`✓ Copied plugin.js to devtools-frontend`);
      } else if (existsSync(uiIndexPath)) {
        // Library build: copy ui/index.js and chunk files / 라이브러리 빌드: ui/index.js 및 chunk 파일 복사
        copyFileSync(uiIndexPath, resolve(pluginDir, 'ui/index.js'));
        console.log(`✓ Copied ui/index.js to devtools-frontend`);

        // Copy chunk files if they exist / chunk 파일이 있으면 복사
        const files = readdirSync(distDir);
        for (const file of files) {
          if (file.startsWith('chunk-') && file.endsWith('.js')) {
            const srcPath = resolve(distDir, file);
            const destPath = resolve(pluginDir, file);
            copyFileSync(srcPath, destPath);
            console.log(`✓ Copied ${file} to devtools-frontend`);
          }
        }
      }

      // Generate HTML file / HTML 파일 생성
      // Use relative path for built files / 빌드된 파일에 상대 경로 사용
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redux DevTools</title>
  <style>
    html {
      height: 100%;
      width: 100%;
    }
    body {
      overflow: hidden;
      height: 100%;
      width: 100%;
      min-width: 350px;
      min-height: 400px;
      margin: 0;
      padding: 0;
      font-family: "Helvetica Neue", "Lucida Grande", sans-serif;
      font-size: 11px;
      background-color: rgb(53, 59, 70);
      color: #fff;
    }
    #root {
      height: 100%;
    }
    #root > div {
      height: 100%;
    }
    #root > div > div:nth-child(2) {
      min-height: 0;
    }
    .ReactCodeMirror {
      overflow: auto;
      height: 100%;
    }
    button:disabled {
      opacity: 0.5;
      cursor: initial !important;
    }

    @media print {
      @page {
        size: auto;
        margin: 0;
      }

      body {
        position: static;
      }

      #root > div > div:not(:nth-child(2)) {
        display: none !important;
      }

      #root > div > div:nth-child(2) {
        overflow: visible !important;
        position: absolute !important;
        z-index: 2147483647;
        page-break-after: avoid;
      }

      #root > div > div:nth-child(2) * {
        overflow: visible !important;
      }
    }
  </style>
</head>
<body>
  <div id="root">
    <div style="display: flex; justify-content: center; align-items: center">
      <span style="color: #fff;">Loading Redux DevTools...</span>
    </div>
  </div>
  <script type="module">
    // Import plugin entry - it will auto-render / 플러그인 엔트리 import - 자동으로 렌더링됨
    // CDP messages are received via postMessage from parent window / CDP 메시지는 부모 윈도우의 postMessage를 통해 수신됨
    // Plugin bundle includes all dependencies and auto-renders / 플러그인 번들은 모든 의존성을 포함하고 자동으로 렌더링됨
    import './plugin.js';
  </script>
</body>
</html>`;

      writeFileSync(resolve(pluginDir, 'index.html'), htmlContent, 'utf-8');
      console.log(`✓ Generated plugin HTML at ${pluginDir}/index.html`);
      console.log(`✓ Plugin files copied to devtools-frontend successfully`);
    },
  };
}

export default defineConfig(() => {
  // For plugin build: bundle everything for iframe / 플러그인 빌드: iframe용으로 모든 것 번들링
  // For library build: keep externals for npm package / 라이브러리 빌드: npm 패키지용으로 externals 유지
  // Always build plugin by default / 기본적으로 항상 플러그인 빌드
  const isPluginBuild = process.env.BUILD_LIB !== 'true';

  if (isPluginBuild) {
    // Plugin build: bundle all dependencies / 플러그인 빌드: 모든 의존성 번들링
    return {
      plugins: [
        react({
          // Use babel for JSX transformation / JSX 변환을 위해 babel 사용
          babel: {
            // Disable optimizeDeps.rollupOptions warning / optimizeDeps.rollupOptions 경고 비활성화
            plugins: [],
          },
        }),
        copyPluginToDevtoolsFrontend(),
      ],
      optimizeDeps: {
        // Use rolldownOptions instead of rollupOptions for rolldown-vite / rolldown-vite를 위해 rollupOptions 대신 rolldownOptions 사용
        rolldownOptions: {},
      },
      build: {
        outDir: 'dist/plugin',
        rollupOptions: {
          input: resolve(__dirname, 'src/ui/plugin-entry.tsx'),
          output: {
            format: 'es',
            entryFileNames: 'plugin.js',
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  // Library build: keep externals / 라이브러리 빌드: externals 유지
  return {
    plugins: [
      react({
        // Use babel for JSX transformation / JSX 변환을 위해 babel 사용
        babel: {
          // Disable optimizeDeps.rollupOptions warning / optimizeDeps.rollupOptions 경고 비활성화
          plugins: [],
        },
      }),
      copyPluginToDevtoolsFrontend(),
    ],
    optimizeDeps: {
      // Use rolldownOptions instead of rollupOptions for rolldown-vite / rolldown-vite를 위해 rollupOptions 대신 rolldownOptions 사용
      rolldownOptions: {},
    },
    build: {
      lib: {
        entry: {
          'react-native': resolve(__dirname, 'src/react-native.ts'),
          'ui/index': resolve(__dirname, 'src/ui/index.ts'),
        },
        formats: ['es', 'cjs'],
        fileName: (format, entryName) => {
          const ext = format === 'es' ? 'js' : 'cjs';
          return `${entryName}.${ext}`;
        },
      },
      rollupOptions: {
        external: [
          'react',
          'react-native',
          'react-dom',
          'react-redux',
          'redux',
          'redux-persist',
          '@redux-devtools/remote',
          '@redux-devtools/app',
          'localforage',
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react-redux': 'ReactRedux',
            redux: 'Redux',
            'redux-persist': 'ReduxPersist',
          },
        },
      },
    },
  };
});
