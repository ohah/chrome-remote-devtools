// Metro transformer for Redux DevTools plugin / Redux DevTools 플러그인용 Metro transformer
// Injects polyfill before entry point to ensure __REDUX_DEVTOOLS_EXTENSION__ is available / entry point 전에 polyfill을 주입하여 __REDUX_DEVTOOLS_EXTENSION__이 사용 가능하도록 보장

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const requirePolyfill = createRequire(__filename);

/**
 * Metro transformer to inject Redux DevTools polyfill before entry point / entry point 전에 Redux DevTools polyfill 주입을 위한 Metro transformer
 * Uses getModulesRunBeforeMainModule to ensure polyfill runs before index.js / getModulesRunBeforeMainModule을 사용하여 polyfill이 index.js 전에 실행되도록 보장
 * Note: getPolyfills doesn't support require(), so we use getModulesRunBeforeMainModule instead / 참고: getPolyfills는 require()를 지원하지 않으므로 getModulesRunBeforeMainModule을 사용
 *
 * @param {import('metro-config').ConfigT} config Metro configuration / Metro 설정
 * @returns {import('metro-config').ConfigT} Modified Metro configuration / 수정된 Metro 설정
 */
function withReduxDevTools(config) {
  // Get the path to the polyfill file / polyfill 파일 경로 가져오기
  // Use require.resolve to get the absolute path from package / 패키지에서 절대 경로를 얻기 위해 require.resolve 사용
  let polyfillPath;
  try {
    // Try to resolve from package name first / 패키지 이름으로 먼저 해석 시도
    polyfillPath = requirePolyfill.resolve(
      '@ohah/chrome-remote-devtools-inspector-react-native/src/redux-devtools-extension-polyfill.js'
    );
  } catch {
    // Fallback to relative path from __dirname / __dirname에서 상대 경로로 폴백
    try {
      polyfillPath = path.resolve(__dirname, './redux-devtools-extension-polyfill.js');
      // Verify the file exists / 파일 존재 확인
      if (!fs.existsSync(polyfillPath)) {
        throw new Error(`Polyfill file not found at ${polyfillPath}`);
      }
    } catch (e2) {
      console.error('[MetroConfig] ❌ Failed to resolve polyfill path:', e2);
      // Return config unchanged if polyfill not found / polyfill을 찾을 수 없으면 변경하지 않은 config 반환
      return config;
    }
  }

  // Get existing modules that run before main / main 전에 실행되는 기존 모듈 가져오기
  const existingModules = config.serializer?.getModulesRunBeforeMainModule
    ? config.serializer.getModulesRunBeforeMainModule()
    : [];

  // Exclude Rust cargo target/ from Metro watcher / Metro 감시에서 Rust cargo target/ 제외
  // Fixes ENOENT when Metro watches monorepo and target/debug/deps/.tmp* is created/deleted / 모노레포 감시 시 target/debug/deps/.tmp* 생성·삭제로 인한 ENOENT 해결
  const existingBlockList = Array.isArray(config.resolver?.blockList)
    ? config.resolver.blockList
    : [];
  const blockList = [...existingBlockList, /[/\\]target[/\\]/];

  // Include source content in source map so Inspector Sources tab shows original files (e.g. App.tsx) / 소스맵에 원본 포함해 Inspector Sources 탭에 원본 파일 표시
  const transformer = {
    ...config.transformer,
    minifierConfig: {
      ...config.transformer?.minifierConfig,
      sourceMap: {
        ...config.transformer?.minifierConfig?.sourceMap,
        includeSources: true,
      },
    },
  };

  return {
    ...config,
    transformer,
    resolver: {
      ...config.resolver,
      blockList,
    },
    serializer: {
      ...config.serializer,
      // Add polyfill to modules that run before main module / main 모듈 전에 실행되는 모듈에 polyfill 추가
      // This ensures the polyfill is installed before any Redux store is created / 이것은 Redux store가 생성되기 전에 polyfill이 설치되도록 보장합니다
      // getModulesRunBeforeMainModule runs as bundled modules, so require() is available / getModulesRunBeforeMainModule은 번들된 모듈로 실행되므로 require()를 사용할 수 있습니다
      getModulesRunBeforeMainModule: () => {
        // Add our polyfill module first / polyfill 모듈을 먼저 추가
        const modules = [polyfillPath, ...existingModules];
        return modules;
      },
    },
  };
}

module.exports = { withReduxDevTools, withChromeRemoteDevToolsRedux: withReduxDevTools };
