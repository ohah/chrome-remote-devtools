// Plugin scanner utility / 플러그인 스캐너 유틸리티
// Scans packages directory for plugins and collects metadata / packages 디렉토리에서 플러그인을 스캔하고 메타데이터 수집

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Plugin metadata / 플러그인 메타데이터
 */
export interface PluginMetadata {
  /** Plugin name / 플러그인 이름 */
  name: string;
  /** Plugin package name / 플러그인 패키지 이름 */
  packageName: string;
  /** Plugin version / 플러그인 버전 */
  version: string;
  /** Plugin description / 플러그인 설명 */
  description?: string;
  /** Panel configuration / 패널 설정 */
  panel?: {
    /** Panel title / 패널 제목 */
    title: string;
    /** Panel HTML file path (relative to plugin dist) / 패널 HTML 파일 경로 (플러그인 dist 기준 상대 경로) */
    htmlFile: string;
    /** Panel order / 패널 순서 */
    order?: number;
    /** Panel icon / 패널 아이콘 */
    icon?: string;
  };
  /** CDP domains / CDP 도메인 */
  cdpDomains?: string[];
  /** Plugin dist directory / 플러그인 dist 디렉토리 */
  distDir: string;
  /** Plugin source directory / 플러그인 소스 디렉토리 */
  srcDir: string;
}

/**
 * Scan packages directory for plugins / packages 디렉토리에서 플러그인 스캔
 * @param packagesDir Packages directory path / packages 디렉토리 경로
 * @returns Array of plugin metadata / 플러그인 메타데이터 배열
 */
export function scanPlugins(packagesDir: string): PluginMetadata[] {
  const plugins: PluginMetadata[] = [];

  try {
    const entries = readdirSync(packagesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      // Check if it's a plugin (ends with -plugin) / 플러그인인지 확인 (-plugin으로 끝나는지)
      if (!entry.name.endsWith('-plugin')) {
        continue;
      }

      const pluginDir = join(packagesDir, entry.name);
      const packageJsonPath = join(pluginDir, 'package.json');
      const distDir = join(pluginDir, 'dist');
      const srcDir = join(pluginDir, 'src');

      // Check if package.json exists / package.json 존재 확인
      if (!existsSync(packageJsonPath)) {
        continue;
      }

      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const pluginName = entry.name.replace(/-plugin$/, '');

        // Check if dist directory exists / dist 디렉토리 존재 확인
        if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
          console.warn(
            `[Plugin Scanner] Plugin ${entry.name} has no dist directory, skipping / 플러그인 ${entry.name}에 dist 디렉토리가 없어 스킵합니다`
          );
          continue;
        }

        // Read plugin config if exists / 플러그인 설정 파일이 있으면 읽기
        const pluginConfigPath = join(pluginDir, 'plugin.config.ts');
        if (existsSync(pluginConfigPath)) {
          // For now, we'll read from package.json exports / 일단 package.json exports에서 읽기
          // TODO: Parse plugin.config.ts properly / TODO: plugin.config.ts를 제대로 파싱하기
        }

        // Try to find panel HTML file / 패널 HTML 파일 찾기
        const uiDir = join(distDir, 'ui');
        let htmlFile: string | undefined;
        if (existsSync(uiDir)) {
          // Look for index.html or panel.html / index.html 또는 panel.html 찾기
          const possibleHtmlFiles = ['index.html', 'panel.html', 'devpanel.html'];
          for (const htmlFileName of possibleHtmlFiles) {
            const htmlPath = join(uiDir, htmlFileName);
            if (existsSync(htmlPath)) {
              htmlFile = `ui/${htmlFileName}`;
              break;
            }
          }
        }

        // If no HTML file found in ui/, check dist root / ui/에 HTML 파일이 없으면 dist 루트 확인
        if (!htmlFile) {
          const possibleHtmlFiles = ['index.html', 'panel.html', 'devpanel.html'];
          for (const htmlFileName of possibleHtmlFiles) {
            const htmlPath = join(distDir, htmlFileName);
            if (existsSync(htmlPath)) {
              htmlFile = htmlFileName;
              break;
            }
          }
        }

        const plugin: PluginMetadata = {
          name: pluginName,
          packageName: packageJson.name || entry.name,
          version: packageJson.version || '0.0.0',
          description: packageJson.description,
          panel: htmlFile
            ? {
                title: packageJson.name || pluginName,
                htmlFile,
                order: 1000, // Default order / 기본 순서
              }
            : undefined,
          distDir,
          srcDir,
        };

        plugins.push(plugin);
      } catch (error) {
        console.error(`[Plugin Scanner] Failed to read plugin ${entry.name}:`, error);
      }
    }
  } catch (error) {
    console.error('[Plugin Scanner] Failed to scan plugins:', error);
  }

  return plugins;
}

/**
 * Get plugin metadata by name / 이름으로 플러그인 메타데이터 가져오기
 * @param plugins Array of plugins / 플러그인 배열
 * @param name Plugin name / 플러그인 이름
 * @returns Plugin metadata or undefined / 플러그인 메타데이터 또는 undefined
 */
export function getPluginByName(
  plugins: PluginMetadata[],
  name: string
): PluginMetadata | undefined {
  return plugins.find((plugin) => plugin.name === name || plugin.packageName === name);
}
