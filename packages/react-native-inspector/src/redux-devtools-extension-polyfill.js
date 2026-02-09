// Redux DevTools Extension polyfill injected by Metro / Metro에서 주입된 Redux DevTools Extension polyfill
// This runs BEFORE index.js / 이것은 index.js 전에 실행됩니다
// This ensures __REDUX_DEVTOOLS_EXTENSION__ is available before any Redux code runs / Redux 코드가 실행되기 전에 __REDUX_DEVTOOLS_EXTENSION__이 사용 가능하도록 보장

// Install polyfill / polyfill 설치
// Use a function to ensure require is available / require가 사용 가능한지 확인하기 위해 함수 사용
(function installPolyfill() {
  // Check if require is available / require가 사용 가능한지 확인
  if (typeof require === 'undefined') {
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
    // Use package name to resolve module / 패키지 이름을 사용하여 모듈 resolve
    // This ensures correct resolution regardless of where the polyfill is loaded from / 이것은 polyfill이 어디서 로드되든 올바른 resolve를 보장합니다
    const {
      installReduxDevToolsPolyfill,
    } = require('@ohah/chrome-remote-devtools-inspector-react-native');

    // Install polyfill immediately / 즉시 polyfill 설치
    // Always install, even if extension exists, to ensure consistency / 일관성을 위해 extension이 존재해도 설치
    if (typeof global !== 'undefined') {
      if (!global.__REDUX_DEVTOOLS_EXTENSION__) {
        installReduxDevToolsPolyfill();
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
