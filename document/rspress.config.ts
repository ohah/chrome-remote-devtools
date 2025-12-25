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
  base: process.env.NODE_ENV === 'production' ? '/chrome-remote-devtools/' : '/',
  title: 'Chrome Remote DevTools',
  description:
    'A remote debugging tool that uses Chrome DevTools Protocol (CDP) to control and debug remote Chrome browsers.',
  lang: 'en',
  icon: '/rspress-icon.png',
  logo: {
    light: '/rspress-light-logo.png',
    dark: '/rspress-dark-logo.png',
  },
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

          // Handle client.js request / client.js 요청 처리
          if (urlPath === '/client.js') {
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

          // Handle devtools-frontend requests / devtools-frontend 요청 처리
          if (!urlPath.startsWith('/devtools-frontend')) {
            next();
            return;
          }

          // Remove query string / 쿼리 문자열 제거
          const cleanPath = urlPath.replace('/devtools-frontend', '') || '/';
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
