// Fetch Metro /json/list targets (React Native dev menu) / Metro /json/list 타깃 조회 (React Native dev menu)

/** Tab id prefix for Metro targets so they don't clash with server client ids / 서버 client id와 겹치지 않도록 Metro 타깃용 탭 id 접두사 */
export const METRO_TAB_ID_PREFIX = 'metro-';

/**
 * Metro /json/list target item (CDP-compatible) / Metro /json/list 항목 (CDP 호환)
 */
export interface MetroTarget {
  /** Unique target id (from Metro) / Metro 기준 타깃 id */
  id: string;
  /** Display title / 표시 제목 */
  title: string;
  /** Description (e.g. "React Native Bridgeless [C++ connection]") / 설명 */
  description?: string;
  /** App id / 앱 id */
  appId?: string;
  /** Type (e.g. "node") / 타입 */
  type?: string;
  /** Full URL to open Metro debugger frontend in iframe / iframe에서 열 Metro 디버거 프론트엔드 전체 URL */
  devtoolsFrontendUrl: string;
  /** WebSocket URL for CDP / CDP용 WebSocket URL */
  webSocketDebuggerUrl: string;
  /** Device name (e.g. "ipad") / 기기 이름 */
  deviceName?: string;
  /** React Native metadata / React Native 메타데이터 */
  reactNative?: {
    logicalDeviceId?: string;
    capabilities?: { nativePageReloads?: boolean; prefersFuseboxFrontend?: boolean };
  };
}

/**
 * Fetch implementation: in Tauri app uses Rust proxy (no Origin header → Metro securityHeadersMiddleware allows).
 * Otherwise global fetch / Tauri 앱에서는 Rust 프록시 사용 (Origin 미전송으로 Metro 보안 미들웨어 통과), 그 외에는 global fetch
 */
async function metroFetch(url: string): Promise<Response> {
  if (typeof window !== 'undefined' && (window as Window & { __TAURI__?: unknown }).__TAURI__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { status, body } = await invoke<{ status: number; body: string }>('fetch_metro_proxy', {
        url,
      });
      return new Response(body, { status });
    } catch {
      // Tauri command unavailable; fall back to global fetch / Tauri 명령 없음 시 global fetch 사용
      return fetch(url);
    }
  }
  return fetch(url);
}

/**
 * Fetch Metro targets from GET /json/list / GET /json/list로 Metro 타깃 목록 가져오기
 * @param metroBaseUrl - Metro base URL (e.g. http://localhost:8081) / Metro 기본 URL
 * @returns Array of targets; empty if fetch fails or URL not set / 타깃 배열, 실패 또는 미설정 시 빈 배열
 */
export async function getMetroTargets(metroBaseUrl: string | null): Promise<MetroTarget[]> {
  if (!metroBaseUrl || !metroBaseUrl.trim()) {
    return [];
  }

  const base = metroBaseUrl.replace(/\/$/, '');
  const url = `${base}/json/list`;

  try {
    const response = await metroFetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: Record<string, unknown>) => {
      const id = String(item.id ?? '');
      const devtoolsFrontendUrlRaw = item.devtoolsFrontendUrl;
      const wsUrl = item.webSocketDebuggerUrl as string | undefined;
      // devtoolsFrontendUrl can be a path (e.g. /debugger-frontend/...) — make absolute
      const devtoolsFrontendUrl =
        typeof devtoolsFrontendUrlRaw === 'string' &&
        (devtoolsFrontendUrlRaw.startsWith('http://') ||
          devtoolsFrontendUrlRaw.startsWith('https://'))
          ? devtoolsFrontendUrlRaw
          : `${base}${devtoolsFrontendUrlRaw ?? ''}`;

      return {
        id,
        title: String(item.title ?? item.id ?? ''),
        description: item.description != null ? String(item.description) : undefined,
        appId: item.appId != null ? String(item.appId) : undefined,
        type: item.type != null ? String(item.type) : undefined,
        devtoolsFrontendUrl,
        webSocketDebuggerUrl: wsUrl ?? '',
        deviceName: item.deviceName != null ? String(item.deviceName) : undefined,
        reactNative: item.reactNative as MetroTarget['reactNative'] | undefined,
      };
    });
  } catch {
    return [];
  }
}
