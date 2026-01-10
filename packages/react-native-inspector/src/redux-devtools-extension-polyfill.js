// Redux DevTools Extension polyfill injected by Metro / Metro에서 주입된 Redux DevTools Extension polyfill
// This runs BEFORE index.js / 이것은 index.js 전에 실행됩니다
// This ensures __REDUX_DEVTOOLS_EXTENSION__ is available before any Redux code runs / Redux 코드가 실행되기 전에 __REDUX_DEVTOOLS_EXTENSION__이 사용 가능하도록 보장

// Log execution to verify this runs early / 실행 확인을 위한 로그
console.log(
  '[MetroPolyfill] Redux DevTools Extension polyfill starting / Redux DevTools Extension polyfill 시작'
);
console.log('[MetroPolyfill] Global object exists:', typeof global !== 'undefined');
console.log('[MetroPolyfill] Require available:', typeof require !== 'undefined');
console.log(
  '[MetroPolyfill] Extension already exists:',
  typeof global !== 'undefined' && !!global.__REDUX_DEVTOOLS_EXTENSION__
);

// Install polyfill / polyfill 설치
// Use a function to ensure require is available / require가 사용 가능한지 확인하기 위해 함수 사용
(function installPolyfill() {
  // Check if require is available / require가 사용 가능한지 확인
  if (typeof require === 'undefined') {
    console.log(
      '[MetroPolyfill] ⏳ Waiting for require to be available / require가 사용 가능해질 때까지 대기'
    );
    // Retry after a short delay / 짧은 지연 후 재시도
    // This should not happen with getModulesRunBeforeMainModule, but just in case / getModulesRunBeforeMainModule에서는 발생하지 않아야 하지만, 혹시 모르니
    if (typeof setTimeout !== 'undefined') {
      setTimeout(installPolyfill, 0);
    } else {
      console.error(
        '[MetroPolyfill] ❌ Require not available and setTimeout not available / require와 setTimeout 모두 사용할 수 없음'
      );
    }
    return;
  }

  try {
    const { installReduxDevToolsPolyfill } = require('./redux-devtools-extension');

    // Install polyfill immediately / 즉시 polyfill 설치
    // Always install, even if extension exists, to ensure consistency / 일관성을 위해 extension이 존재해도 설치
    if (typeof global !== 'undefined') {
      if (!global.__REDUX_DEVTOOLS_EXTENSION__) {
        console.log('[MetroPolyfill] Installing polyfill / polyfill 설치 중');
        installReduxDevToolsPolyfill();
        console.log('[MetroPolyfill] ✅ Polyfill installed successfully / polyfill 설치 완료');
        console.log('[MetroPolyfill] Extension now exists:', !!global.__REDUX_DEVTOOLS_EXTENSION__);
      } else {
        console.log(
          '[MetroPolyfill] Extension already exists, skipping installation / Extension이 이미 존재함, 설치 건너뜀'
        );
      }
    } else {
      console.error(
        '[MetroPolyfill] ❌ Global object not available / Global 객체를 사용할 수 없음'
      );
    }
  } catch (error) {
    console.error('[MetroPolyfill] ❌ Failed to install polyfill / polyfill 설치 실패:', error);
    // Don't throw - allow app to continue / throw하지 않음 - 앱이 계속 실행되도록 허용
    // The polyfill will be installed later when index.ts is loaded / polyfill은 나중에 index.ts가 로드될 때 설치됨
  }
})();
