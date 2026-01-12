#!/usr/bin/env node
// Apply CMake build directory patches / CMake 빌드 디렉토리 패치 적용
const fs = require('fs');
const path = require('path');

/**
 * Apply buildStagingDirectory patch to a package / 패키지에 buildStagingDirectory 패치 적용
 * @param {string} packageName - Package name / 패키지 이름
 * @param {string} buildGradlePath - Path to build.gradle file / build.gradle 파일 경로
 */
function applyPatch(packageName, buildGradlePath) {
  const fullPath = path.resolve(__dirname, '..', buildGradlePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`[apply-cmake-patches] ${packageName}: build.gradle not found at ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if patch is already applied by looking for the specific patch pattern /
  // 특정 패치 패턴을 확인하여 패치가 이미 적용되었는지 확인
  // Match the exact patch code pattern including comments /
  // 주석을 포함한 정확한 패치 코드 패턴 매칭
  const patchAlreadyAppliedPattern =
    /def rootDir = rootProject\.rootDir[\s\S]*?buildStagingDirectory "\$\{rootDir\}\/\.cmake-build\/\$\{project\.name\}"/s;
  if (patchAlreadyAppliedPattern.test(content)) {
    console.log(`[apply-cmake-patches] ${packageName}: Patch already applied`);
    return;
  }

  // Find the cmake block and add buildStagingDirectory / cmake 블록을 찾아 buildStagingDirectory 추가
  // Use non-greedy quantifier to match the first cmake block correctly /
  // 첫 번째 cmake 블록을 올바르게 매칭하기 위해 non-greedy quantifier 사용
  const cmakeBlockPattern = /(\s+cmake\s*\{[\s\S]*?path\s+"CMakeLists\.txt"[\s\S]*?)(\})/s;

  if (!cmakeBlockPattern.test(content)) {
    console.warn(`[apply-cmake-patches] ${packageName}: CMake block not found`);
    return;
  }

  // Use rootProject.rootDir instead of parentFile chain for more robust path resolution /
  // 더 견고한 경로 해석을 위해 parentFile 체인 대신 rootProject.rootDir 사용
  const patchCode = '\n' +
      '      // Use shorter build directory to avoid Windows path length limit\n' +
      '      // Windows 경로 길이 제한을 피하기 위해 더 짧은 빌드 디렉토리 사용\n' +
      '      def rootDir = rootProject.rootDir\n' +
      '      buildStagingDirectory "${rootDir}/.cmake-build/${project.name}"';

  content = content.replace(
    cmakeBlockPattern,
    `$1${patchCode}\n$2`
  );

  // Add error handling for file write operation / 파일 쓰기 작업에 대한 에러 처리 추가
  try {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`[apply-cmake-patches] ${packageName}: Patch applied successfully`);
  } catch (error) {
    console.error(`[apply-cmake-patches] ${packageName}: Failed to apply patch to ${fullPath}`);
    console.error(error);
    throw error;
  }
}

// Apply patches to packages / 패키지에 패치 적용
const packages = [
  {
    name: 'react-native-nitro-modules',
    path: 'node_modules/react-native-nitro-modules/android/build.gradle',
  },
  {
    name: 'react-native-mmkv',
    path: 'node_modules/react-native-mmkv/android/build.gradle',
  },
];

packages.forEach((pkg) => {
  applyPatch(pkg.name, pkg.path);
});
