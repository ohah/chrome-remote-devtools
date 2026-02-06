// Fetch Metro source map and populate cache for DevTools Sources panel
// Metro 소스맵을 가져와 DevTools Sources 패널용 캐시에 저장

import { NativeModules, Platform } from 'react-native';
import { setSourceMapCache, updatePageResources } from './cdp-message-handler';

/**
 * Detect Metro source map URL from React Native bundle URL (NativeModules.SourceCode.scriptURL)
 * RN 번들 URL에서 Metro 소스맵 URL 자동 감지
 */
function detectMetroSourceMapUrl(): string | null {
  try {
    const scriptURL: string | undefined =
      NativeModules.SourceCode?.getConstants?.()?.scriptURL ??
      (NativeModules.SourceCode as Record<string, unknown>)?.scriptURL;
    if (typeof scriptURL === 'string' && scriptURL.startsWith('http')) {
      // http://localhost:8081/index.bundle?platform=ios&dev=true → http://localhost:8081/index.map?platform=ios&dev=true
      return scriptURL.replace('.bundle', '.map');
    }
  } catch {}
  return null;
}

/**
 * Fetch Metro source map and populate DevTools Sources cache / Metro 소스맵 fetch 후 DevTools Sources 캐시 채우기
 * @param metroBaseUrl Optional Metro base URL (e.g. "http://localhost:8081"); auto-detects if omitted / Metro 기본 URL (생략 시 자동 감지)
 */
export async function fetchAndCacheSourceMap(metroBaseUrl?: string): Promise<void> {
  let url: string | null = null;

  if (metroBaseUrl) {
    const base = metroBaseUrl.replace(/\/$/, '');
    url = `${base}/index.map?platform=${Platform.OS}&dev=true&minify=false`;
  } else {
    url = detectMetroSourceMapUrl();
  }

  if (!url) {
    console.warn(
      '[ChromeRemoteDevTools] Cannot detect Metro source map URL. Pass metroBaseUrl prop or ensure Metro dev server is running. / Metro 소스맵 URL 감지 불가. metroBaseUrl prop을 전달하거나 Metro 서버가 실행 중인지 확인하세요.'
    );
    return;
  }

  try {
    console.log(`[ChromeRemoteDevTools] Fetching source map: ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[ChromeRemoteDevTools] Source map fetch failed (${res.status})`);
      return;
    }

    const json = await res.json();
    if (!Array.isArray(json.sources) || !Array.isArray(json.sourcesContent)) {
      console.warn('[ChromeRemoteDevTools] Invalid source map format / 잘못된 소스맵 형식');
      return;
    }

    setSourceMapCache(json.sources, json.sourcesContent);
    updatePageResources(json.sources);
    console.log(
      `[ChromeRemoteDevTools] Source map loaded: ${json.sources.length} files / 소스맵 로드: ${json.sources.length}개 파일`
    );
  } catch (e) {
    console.warn('[ChromeRemoteDevTools] Source map fetch error:', e);
  }
}
