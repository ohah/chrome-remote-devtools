// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Re-export types from type definitions / 타입 정의에서 타입 재export
export type { Replayer, playerConfig as ReplayerConfig } from './package/dist/index.d.ts';

// Global type declaration for UMD bundle / UMD 번들을 위한 전역 타입 선언
declare global {
  interface Window {
    rrweb?: {
      Replayer: typeof import('./package/dist/index.d.ts').Replayer;
    };
  }
}

// Type for Replayer class / Replayer 클래스 타입
export type ReplayerClass = typeof import('./package/dist/index.d.ts').Replayer;

/**
 * Load Replayer class via script tag (UMD format) / 스크립트 태그를 통해 Replayer 클래스 로드 (UMD 형식)
 * This avoids TypeScript compilation of the minified JavaScript / 이렇게 하면 minified JavaScript의 TypeScript 컴파일을 피할 수 있음
 */
export async function loadReplayer(): Promise<ReplayerClass> {
  // Check if already loaded / 이미 로드되었는지 확인
  if (window.rrweb?.Replayer) {
    return window.rrweb.Replayer;
  }

  // Get the script path / 스크립트 경로 가져오기
  // DevTools bundles files, so we need to use the resource path / DevTools가 파일을 번들링하므로 리소스 경로를 사용해야 함
  const scriptPath = 'third_party/rrweb-replay/package/dist/replay.umd.cjs';

  return new Promise((resolve, reject) => {
    // Check if script is already being loaded / 스크립트가 이미 로드 중인지 확인
    const existingScript = document.querySelector(`script[data-rrweb-replay]`);
    if (existingScript) {
      // Wait for it to load / 로드될 때까지 대기
      const checkInterval = setInterval(() => {
        if (window.rrweb?.Replayer) {
          clearInterval(checkInterval);
          resolve(window.rrweb.Replayer);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for Replayer to load / Replayer 로드 대기 시간 초과'));
      }, 5000);
      return;
    }

    // Create and load script tag / 스크립트 태그 생성 및 로드
    const script = document.createElement('script');
    script.setAttribute('data-rrweb-replay', 'true');
    script.src = scriptPath;

    script.onload = () => {
      // UMD bundle exposes rrweb on window / UMD 번들이 window에 rrweb을 노출함
      if (window.rrweb?.Replayer) {
        resolve(window.rrweb.Replayer);
      } else {
        reject(new Error('Replayer not found on window.rrweb after script load / 스크립트 로드 후 window.rrweb에서 Replayer를 찾을 수 없음'));
      }
    };

    script.onerror = () => {
      reject(new Error(`Failed to load rrweb replay script from ${scriptPath} / ${scriptPath}에서 rrweb replay 스크립트 로드 실패`));
    };

    document.head.appendChild(script);
  });
}

