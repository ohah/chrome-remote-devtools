/**
 * React Native Autolinking configuration / React Native Autolinking 설정
 * This file configures how React Native CLI links this package / React Native CLI가 이 패키지를 링크하는 방법을 설정합니다
 * Supports both monorepo workspace and npm package installations / 모노레포 workspace와 npm 패키지 설치 모두 지원
 */

const path = require('path');
const fs = require('fs');

/**
 * Find workspace root by looking for package.json with workspaces field / workspaces 필드가 있는 package.json을 찾아 workspace root 찾기
 * @returns {string|null} Workspace root path or null if not in monorepo / Workspace root 경로 또는 모노레포가 아니면 null
 */
function findWorkspaceRoot(startDir = __dirname) {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return dir;
        }
      } catch {
        // Ignore parse errors / 파싱 에러 무시
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

// Detect if we're in a monorepo / 모노레포인지 감지
const workspaceRoot = findWorkspaceRoot(__dirname);
const isMonorepo = workspaceRoot !== null;

// Determine paths based on environment / 환경에 따라 경로 결정
// In monorepo, use absolute paths from workspace root / 모노레포에서는 workspace root 기준 절대 경로 사용
// In npm package, use relative paths / npm 패키지에서는 상대 경로 사용
const podspecPath = isMonorepo
  ? path.resolve(__dirname, 'ChromeRemoteDevToolsInspector.podspec')
  : './ChromeRemoteDevToolsInspector.podspec';

const androidSourceDir = isMonorepo
  ? path.resolve(__dirname, 'android')
  : './android';

module.exports = {
  ios: {
    podspecPath,
  },
  android: {
    sourceDir: androidSourceDir,
    packageImportPath: 'import com.ohah.chromeremotedevtools.ChromeRemoteDevToolsInspectorPackage;',
  },
};
