#!/usr/bin/env bun
// Remove workspace dependencies before publish / publish 전에 workspace 의존성 제거
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Remove workspace dependencies from package.json / package.json에서 workspace 의존성 제거
 * @param packageJsonPath - Path to package.json / package.json 경로
 */
function removeWorkspaceDependencies(packageJsonPath: string): void {
  const resolvedPath = resolve(packageJsonPath);

  // Check if file exists / 파일 존재 확인
  if (!existsSync(resolvedPath)) {
    console.error(`Error: package.json not found at ${resolvedPath}`);
    console.error('Please ensure the path is correct and the file exists.');
    process.exit(1);
  }

  let pkg: Record<string, unknown>;
  try {
    const content = readFileSync(resolvedPath, 'utf-8');
    pkg = JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in package.json at ${resolvedPath}`);
      console.error(`JSON parse error: ${error.message}`);
      process.exit(1);
    } else if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(`Error: Cannot read package.json at ${resolvedPath}`);
      console.error(`File system error: ${error.message}`);
      process.exit(1);
    } else {
      console.error(`Error: Failed to read package.json at ${resolvedPath}`);
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  const dependencyKeys = [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
    'devDependencies',
  ];

  dependencyKeys.forEach((key) => {
    if (pkg[key] && typeof pkg[key] === 'object' && pkg[key] !== null) {
      const deps = pkg[key] as Record<string, unknown>;
      Object.keys(deps).forEach((dep) => {
        const version = deps[dep];
        if (typeof version === 'string' && version.startsWith('workspace:')) {
          delete deps[dep];
        }
      });
      // Remove empty objects / 빈 객체 제거
      if (Object.keys(deps).length === 0) {
        delete pkg[key];
      }
    }
  });

  try {
    writeFileSync(resolvedPath, JSON.stringify(pkg, null, 2) + '\n');
  } catch (error) {
    console.error(`Error: Failed to write package.json at ${resolvedPath}`);
    if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
      console.error('Permission denied. Please check file permissions.');
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }
}

// Get package.json path from command line argument or use current directory / 명령줄 인자에서 package.json 경로 가져오기 또는 현재 디렉토리 사용
const packageJsonPath = process.argv[2] || join(process.cwd(), 'package.json');

try {
  removeWorkspaceDependencies(packageJsonPath);
} catch (error) {
  console.error('Unexpected error occurred:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
