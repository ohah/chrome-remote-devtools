// Remove workspace dependencies before publish / publish 전에 workspace 의존성 제거
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Remove workspace dependencies from package.json / package.json에서 workspace 의존성 제거
 * @param packageJsonPath - Path to package.json / package.json 경로
 */
function removeWorkspaceDependencies(packageJsonPath: string): void {
  const resolvedPath = resolve(packageJsonPath);
  const pkg = JSON.parse(readFileSync(resolvedPath, 'utf-8'));

  const dependencyKeys = ['dependencies', 'peerDependencies', 'optionalDependencies'];

  dependencyKeys.forEach((key) => {
    if (pkg[key]) {
      Object.keys(pkg[key]).forEach((dep) => {
        const version = pkg[key][dep];
        if (typeof version === 'string' && version.startsWith('workspace:')) {
          delete pkg[key][dep];
        }
      });
      // Remove empty objects / 빈 객체 제거
      if (Object.keys(pkg[key]).length === 0) {
        delete pkg[key];
      }
    }
  });

  writeFileSync(resolvedPath, JSON.stringify(pkg, null, 2) + '\n');
}

// Get package.json path from command line argument or use current directory / 명령줄 인자에서 package.json 경로 가져오기 또는 현재 디렉토리 사용
const packageJsonPath = process.argv[2] || join(process.cwd(), 'package.json');

removeWorkspaceDependencies(packageJsonPath);
