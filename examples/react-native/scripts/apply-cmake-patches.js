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

  // Check if patch is already applied / 패치가 이미 적용되었는지 확인
  if (content.includes('buildStagingDirectory')) {
    console.log(`[apply-cmake-patches] ${packageName}: Patch already applied`);
    return;
  }

  // Find the cmake block and add buildStagingDirectory / cmake 블록을 찾아 buildStagingDirectory 추가
  const cmakeBlockPattern = /(\s+cmake\s*\{[^}]*path\s+"CMakeLists\.txt")(\s*\})/s;

  if (!cmakeBlockPattern.test(content)) {
    console.warn(`[apply-cmake-patches] ${packageName}: CMake block not found`);
    return;
  }

  const patchCode = '\n' +
      '      // Use shorter build directory to avoid Windows path length limit /\n' +
      '      // Windows 경로 길이 제한을 피하기 위해 더 짧은 빌드 디렉토리 사용\n' +
      '      def rootDir = rootProject.projectDir.parentFile.parentFile.parentFile\n' +
      '      buildStagingDirectory "${rootDir}/.cmake-build/${project.name}"';

  content = content.replace(
    cmakeBlockPattern,
    `$1${patchCode}$2`
  );

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`[apply-cmake-patches] ${packageName}: Patch applied successfully`);
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
