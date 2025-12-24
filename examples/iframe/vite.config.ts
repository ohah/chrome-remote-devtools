import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'path';
import { readFileSync, existsSync, copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';

// DevTools frontend path - use bundled only / DevTools frontend 경로 - bundled만 사용
const devtoolsPath = path.resolve(__dirname, '../../devtools/bundled/front_end');

// Recursively copy directory / 디렉토리 재귀적 복사
function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Plugin to serve devtools-frontend in dev and copy in build / devtools-frontend를 개발 시 서빙하고 빌드 시 복사하는 플러그인
function serveDevtoolsFrontend() {
  return {
    name: 'serve-devtools-frontend',
    // Resolve devtools-frontend imports / devtools-frontend import 해결
    resolveId(id: string, importer?: string) {
      if (
        id.startsWith('/devtools-frontend/') ||
        (importer && importer.includes('devtools-frontend'))
      ) {
        let resolvedPath = id;

        // If it's a relative import from devtools-frontend (bundled) / devtools-frontend(bundled)에서의 상대 import인 경우
        if (importer && importer.includes('devtools-frontend')) {
          const importerDir = path.dirname(importer);
          resolvedPath = path.resolve(importerDir, id);
        } else if (id.startsWith('/devtools-frontend/')) {
          // Use bundled path only / bundled 경로만 사용
          const relativePath = id.replace('/devtools-frontend/', '');
          resolvedPath = path.join(devtoolsPath, relativePath);
        }

        // Check if file exists (bundled contains only .js files) / 파일 존재 확인 (bundled는 .js 파일만 포함)
        if (existsSync(resolvedPath)) {
          return resolvedPath;
        }
      }
      return null;
    },
    // Load devtools-frontend files / devtools-frontend 파일 로드
    load(id: string) {
      // Use bundled path only / bundled 경로만 사용
      if (id.startsWith(devtoolsPath)) {
        try {
          if (existsSync(id)) {
            return readFileSync(id, 'utf-8');
          }
        } catch {
          // File not found or error reading / 파일을 찾을 수 없거나 읽기 오류
        }
      }
      return null;
    },
    // Serve files in development / 개발 시 파일 서빙
    configureServer(server: {
      middlewares: {
        use: (path: string, handler: (req: any, res: any, next: () => void) => void) => void;
      };
    }) {
      server.middlewares.use('/devtools-frontend', (req: any, res: any, _next: () => void) => {
        const urlPath = req.url || '';
        // Remove query string / 쿼리 문자열 제거
        const cleanPath = urlPath.split('?')[0];
        const filePath = path.join(devtoolsPath, cleanPath);
        const ext = path.extname(filePath);

        // Serve all bundled files as static (already built, no transformation needed) / 모든 bundled 파일을 정적으로 서빙 (이미 빌드됨, 변환 불필요)
        if (existsSync(filePath) && statSync(filePath).isFile()) {
          try {
            const content = readFileSync(filePath);
            // Set appropriate content type / 적절한 Content-Type 설정
            if (ext === '.css') {
              res.setHeader('Content-Type', 'text/css');
            } else if (ext === '.js' || ext === '.mjs') {
              res.setHeader('Content-Type', 'application/javascript');
            } else if (ext === '.json') {
              res.setHeader('Content-Type', 'application/json');
            } else if (ext === '.html') {
              res.setHeader('Content-Type', 'text/html');
            } else if (ext === '.svg') {
              res.setHeader('Content-Type', 'image/svg+xml');
            } else if (ext === '.png') {
              res.setHeader('Content-Type', 'image/png');
            } else if (ext === '.avif') {
              res.setHeader('Content-Type', 'image/avif');
            }
            res.end(content);
            return;
          } catch (error) {
            console.error(`Error serving file ${filePath}:`, error);
            res.statusCode = 500;
            res.end('Internal server error');
            return;
          }
        }

        res.statusCode = 404;
        res.end('File not found');
      });
    },
    // Copy files in build / 빌드 시 파일 복사
    buildEnd() {
      const outDir = path.resolve(__dirname, 'dist');
      const targetDir = path.join(outDir, 'devtools-frontend');

      console.log('Copying devtools-frontend files for build...');
      try {
        // Use bundled path only / bundled 경로만 사용
        copyDir(devtoolsPath, targetDir);
        console.log('devtools-frontend files copied successfully');
      } catch (error) {
        console.error('Failed to copy devtools-frontend files:', error);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
    serveDevtoolsFrontend(),
  ],
  // Resolve devtools-frontend imports / devtools-frontend import 해결
  resolve: {
    alias: {
      '/devtools-frontend': devtoolsPath,
    },
    // Allow accessing files outside of project root / 프로젝트 루트 외부 파일 접근 허용
    preserveSymlinks: false,
  },
  // Allow access to devtools-frontend directory / devtools-frontend 디렉토리 접근 허용
  server: {
    fs: {
      allow: [
        // Allow access to project root / 프로젝트 루트 접근 허용
        path.resolve(__dirname, '../..'),
        // Allow access to bundled path / bundled 경로 접근 허용
        devtoolsPath,
      ],
    },
  },
  // Optimize dependencies / 의존성 최적화
  optimizeDeps: {
    // Exclude devtools-frontend from optimization (already built) / devtools-frontend를 최적화에서 제외 (이미 빌드됨)
    exclude: ['devtools-frontend'],
    // Only optimize your own source files / 자신의 소스 파일만 최적화
    entries: ['src/**/*.{ts,tsx,js,jsx}', 'index.html'],
  },
});
