// Plugin server middleware / 플러그인 서버 미들웨어
// Serves plugin files and metadata / 플러그인 파일 및 메타데이터 서빙

import type { Connect } from 'vite';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { scanPlugins, type PluginMetadata } from './plugin-scanner';

// Cache plugins metadata / 플러그인 메타데이터 캐시
let cachedPlugins: PluginMetadata[] | null = null;
let packagesDir: string | null = null;

/**
 * Initialize plugin scanner / 플러그인 스캐너 초기화
 * @param packagesDirPath Path to packages directory / packages 디렉토리 경로
 */
export function initializePluginScanner(packagesDirPath: string): void {
  packagesDir = packagesDirPath;
  // Scan plugins on initialization / 초기화 시 플러그인 스캔
  cachedPlugins = scanPlugins(packagesDirPath);
  console.log(
    `[Plugin Server] Found ${cachedPlugins.length} plugin(s) / ${cachedPlugins.length}개의 플러그인을 찾았습니다`
  );
  cachedPlugins.forEach((plugin) => {
    console.log(`[Plugin Server] - ${plugin.name} (${plugin.packageName}@${plugin.version})`);
  });
}

/**
 * Get plugins metadata / 플러그인 메타데이터 가져오기
 * @returns Array of plugin metadata / 플러그인 메타데이터 배열
 */
export function getPlugins(): PluginMetadata[] {
  if (!cachedPlugins || !packagesDir) {
    return [];
  }
  // Re-scan plugins if needed (for development) / 필요시 플러그인 재스캔 (개발용)
  // In production, we can cache this / 프로덕션에서는 캐시 가능
  return cachedPlugins;
}

/**
 * Get content type for file extension / 파일 확장자에 대한 Content-Type 가져오기
 * @param ext File extension / 파일 확장자
 * @returns Content type / Content-Type
 */
function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };
  return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Create plugin server middleware / 플러그인 서버 미들웨어 생성
 * @returns Vite middleware function / Vite 미들웨어 함수
 */
export function createPluginServerMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (!req.url) {
      next();
      return;
    }

    const url = new URL(req.url, 'http://localhost');

    // Handle plugin metadata API / 플러그인 메타데이터 API 처리
    if (url.pathname === '/api/plugins') {
      const plugins = getPlugins();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(
        JSON.stringify({
          plugins: plugins.map((plugin) => ({
            name: plugin.name,
            packageName: plugin.packageName,
            version: plugin.version,
            description: plugin.description,
            panel: plugin.panel,
            cdpDomains: plugin.cdpDomains,
          })),
        })
      );
      return;
    }

    // Handle plugin file serving / 플러그인 파일 서빙 처리
    // Format: /plugins/{plugin-name}/{file-path}
    // 형식: /plugins/{plugin-name}/{file-path}
    if (url.pathname.startsWith('/plugins/')) {
      const pathParts = url.pathname.replace('/plugins/', '').split('/');
      if (pathParts.length < 2) {
        res.statusCode = 404;
        res.end('Plugin file not found');
        return;
      }

      const pluginName = pathParts[0];
      const filePath = pathParts.slice(1).join('/');

      const plugins = getPlugins();
      const plugin = plugins.find((p) => p.name === pluginName || p.packageName === pluginName);

      if (!plugin) {
        res.statusCode = 404;
        res.end(`Plugin ${pluginName} not found`);
        return;
      }

      // Serve file from plugin dist directory / 플러그인 dist 디렉토리에서 파일 서빙
      const fullPath = join(plugin.distDir, filePath);

      if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
        res.statusCode = 404;
        res.end('File not found');
        return;
      }

      try {
        const content = readFileSync(fullPath);
        const ext = extname(fullPath);
        const contentType = getContentType(ext);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour / 1시간 캐시
        res.end(content);
        return;
      } catch (error) {
        console.error(`[Plugin Server] Error serving file ${fullPath}:`, error);
        res.statusCode = 500;
        res.end('Internal server error');
        return;
      }
    }

    next();
  };
}
