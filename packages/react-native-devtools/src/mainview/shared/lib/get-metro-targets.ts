/**
 * Fetch Metro /json/list targets (React Native dev menu) / Metro /json/list 타깃 조회
 * Uses main process fetch when in Electrobun to avoid CORS / Electrobun에서는 CORS 회피 위해 메인에서 fetch
 */

import { fetchJsonFromMain } from './fetch-from-main';

export const METRO_TAB_ID_PREFIX = 'metro-';

export interface MetroTarget {
  id: string;
  title: string;
  description?: string;
  appId?: string;
  type?: string;
  devtoolsFrontendUrl: string;
  webSocketDebuggerUrl: string;
  deviceName?: string;
  reactNative?: {
    logicalDeviceId?: string;
    capabilities?: { nativePageReloads?: boolean; prefersFuseboxFrontend?: boolean };
  };
}

export async function getMetroTargets(metroBaseUrl: string | null): Promise<MetroTarget[]> {
  if (!metroBaseUrl || !metroBaseUrl.trim()) return [];

  const base = metroBaseUrl.replace(/\/$/, '');
  const url = `${base}/json/list`;

  try {
    // Prefer main process fetch (no CORS) when in Electrobun
    const dataFromMain = await fetchJsonFromMain<unknown>(url);
    const data =
      dataFromMain !== null ? dataFromMain : await fetch(url).then((r) => (r.ok ? r.json() : []));
    if (!Array.isArray(data)) return [];

    return data.map((item: Record<string, unknown>) => {
      const id = String(item.id ?? '');
      const devtoolsFrontendUrlRaw = item.devtoolsFrontendUrl;
      const wsUrl = item.webSocketDebuggerUrl as string | undefined;
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
