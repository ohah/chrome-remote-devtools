import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import pluginMermaid from 'rspress-plugin-mermaid';
import { existsSync, statSync, readFileSync } from 'fs';
import { rspack } from '@rspack/core';

// DevTools frontend path - use bundled only / DevTools frontend 경로 - bundled만 사용
const devtoolsPath = path.resolve(__dirname, '../devtools/bundled/front_end');
// Client script path / 클라이언트 스크립트 경로
const clientPath = path.resolve(__dirname, '../packages/client/dist/index.js');

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  base: '/chrome-remote-devtools/',
  title: 'Chrome Remote DevTools',
  description:
    'A remote debugging tool that uses Chrome DevTools Protocol (CDP) to control and debug remote Chrome browsers.',
  lang: 'en',
  icon: '/logo.png',
  locales: [
    {
      lang: 'en',
      label: 'English',
    },
    {
      lang: 'ko',
      label: '한국어',
    },
  ],
  // Type assertion needed because rspress-plugin-mermaid may not export proper types
  // 타입 단언이 필요합니다. rspress-plugin-mermaid가 적절한 타입을 내보내지 않을 수 있기 때문입니다
  plugins: [pluginMermaid() as any],
  builderConfig: {
    output: {
      distPath: {
        root: 'doc_build',
      },
    },
    // Use RSPack plugin instead of copy config / copy 설정 대신 RSPack 플러그인 사용
    tools: {
      rspack: (config) => {
        // Add CopyRspackPlugin / CopyRspackPlugin 추가
        const copyPatterns = [];

        if (existsSync(devtoolsPath)) {
          copyPatterns.push({
            from: devtoolsPath,
            to: 'devtools-frontend',
            // Force overwrite to prevent empty files / 빈 파일 방지를 위해 강제 덮어쓰기
            force: true,
            // Ignore patterns that might conflict / 충돌할 수 있는 패턴 무시
            globOptions: {
              ignore: ['**/node_modules/**'],
            },
          });
        }

        if (existsSync(clientPath)) {
          copyPatterns.push({
            from: clientPath,
            to: 'client.js',
          });
        }

        if (copyPatterns.length > 0) {
          config.plugins = config.plugins || [];
          config.plugins.push(
            new rspack.CopyRspackPlugin({
              patterns: copyPatterns,
            })
          );
        }

        return config;
      },
    },
    // Configure dev server / 개발 서버 설정
    dev: {
      setupMiddlewares: (middlewares, _server) => {
        // Add custom middleware to serve devtools-frontend and client.js / devtools-frontend와 client.js 서빙을 위한 커스텀 미들웨어 추가
        middlewares.push((req, res, next) => {
          const urlPath = req.url || '';

          // Handle client.js request (with base path) / client.js 요청 처리 (base 경로 포함)
          if (urlPath === '/chrome-remote-devtools/client.js' || urlPath === '/client.js') {
            if (existsSync(clientPath) && statSync(clientPath).isFile()) {
              try {
                const content = readFileSync(clientPath);
                res.setHeader('Content-Type', 'application/javascript');
                res.end(content);
                return;
              } catch (error) {
                console.error(`Error serving client.js:`, error);
                res.statusCode = 500;
                res.end('Internal server error');
                return;
              }
            }
            res.statusCode = 404;
            res.end('File not found');
            return;
          }

          // Handle devtools-frontend requests (with base path) / devtools-frontend 요청 처리 (base 경로 포함)
          const devtoolsPrefix = '/chrome-remote-devtools/devtools-frontend';
          if (!urlPath.startsWith(devtoolsPrefix) && !urlPath.startsWith('/devtools-frontend')) {
            next();
            return;
          }

          // Remove query string and devtools prefix / 쿼리 문자열 및 devtools 프리픽스 제거
          const pathWithoutQuery = (urlPath.split('?')[0] || '').split('#')[0];
          let relativePath = '';
          if (pathWithoutQuery.startsWith(devtoolsPrefix)) {
            relativePath = pathWithoutQuery.slice(devtoolsPrefix.length);
          } else if (pathWithoutQuery.startsWith('/devtools-frontend')) {
            relativePath = pathWithoutQuery.slice('/devtools-frontend'.length);
          } else {
            relativePath = pathWithoutQuery;
          }
          const cleanPath = relativePath || '/';

          // Resolve the requested path safely under devtoolsPath / devtoolsPath 하위로 안전하게 경로 해석
          const filePath = path.resolve(devtoolsPath, '.' + cleanPath);

          // Prevent path traversal: ensure resolved path stays within devtoolsPath / 경로 역참조 방지: 해석된 경로가 devtoolsPath 내부인지 확인
          if (filePath !== devtoolsPath && !filePath.startsWith(devtoolsPath + path.sep)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

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
        return middlewares;
      },
    },
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/ohah/chrome-remote-devtools',
      },
    ],
  },
});
