// getMetroTargets and Metro list parsing tests / getMetroTargets 및 Metro 목록 파싱 테스트
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { getMetroTargets, METRO_TAB_ID_PREFIX } from '../get-metro-targets';
import type { MetroTarget } from '../get-metro-targets';

describe('getMetroTargets', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('returns empty array when metroBaseUrl is null / metroBaseUrl이 null이면 빈 배열 반환', async () => {
    const result = await getMetroTargets(null);
    expect(result).toEqual([]);
  });

  test('returns empty array when metroBaseUrl is empty string / metroBaseUrl이 빈 문자열이면 빈 배열 반환', async () => {
    const result = await getMetroTargets('');
    expect(result).toEqual([]);
  });

  test('returns empty array when metroBaseUrl is whitespace only / metroBaseUrl이 공백만 있으면 빈 배열 반환', async () => {
    const result = await getMetroTargets('   ');
    expect(result).toEqual([]);
  });

  test('fetches and maps Metro /json/list to MetroTarget[] when response is ok / 응답이 ok일 때 Metro /json/list를 MetroTarget[]로 매핑', async () => {
    const mockList = [
      {
        id: 'page-1',
        title: 'React Native',
        webSocketDebuggerUrl: 'ws://localhost:8081/page/page-1',
        devtoolsFrontendUrl: '/debugger-frontend/1',
        deviceName: 'sdk_gphone64_arm64',
      },
    ];

    globalThis.fetch = mock((url: string) => {
      expect(url).toBe('http://localhost:8081/json/list');
      return Promise.resolve(
        new Response(JSON.stringify(mockList), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }) as unknown as typeof fetch;

    const result = await getMetroTargets('http://localhost:8081');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'page-1',
      title: 'React Native',
      webSocketDebuggerUrl: 'ws://localhost:8081/page/page-1',
      deviceName: 'sdk_gphone64_arm64',
    } as Partial<MetroTarget>);
    expect(result[0].devtoolsFrontendUrl).toBe('http://localhost:8081/debugger-frontend/1');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('returns empty array when response is not ok / 응답이 ok가 아니면 빈 배열 반환', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Unauthorized', { status: 401 }))
    ) as unknown as typeof fetch;

    const result = await getMetroTargets('http://localhost:8081');

    expect(result).toEqual([]);
  });

  test('returns empty array when response body is not an array / 응답 본문이 배열이 아니면 빈 배열 반환', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as unknown as typeof fetch;

    const result = await getMetroTargets('http://localhost:8081');

    expect(result).toEqual([]);
  });

  test('returns empty array on fetch error / fetch 에러 시 빈 배열 반환', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('Network error'))
    ) as unknown as typeof fetch;

    const result = await getMetroTargets('http://localhost:8081');

    expect(result).toEqual([]);
  });

  test('strips trailing slash from metroBaseUrl when building list URL / list URL 생성 시 metroBaseUrl 끝 슬래시 제거', async () => {
    globalThis.fetch = mock((url: string) => {
      expect(url).toBe('http://localhost:8081/json/list');
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }) as unknown as typeof fetch;

    await getMetroTargets('http://localhost:8081/');

    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8081/json/list');
  });

  test('METRO_TAB_ID_PREFIX is metro- / METRO_TAB_ID_PREFIX는 metro-', () => {
    expect(METRO_TAB_ID_PREFIX).toBe('metro-');
  });
});
