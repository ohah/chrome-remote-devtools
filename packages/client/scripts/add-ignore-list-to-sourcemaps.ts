#!/usr/bin/env bun
// Add ignoreList to sourcemap files / 소스맵 파일에 ignoreList 추가
// This script adds the ignoreList field to sourcemap files so DevTools automatically ignores built files
// 이 스크립트는 소스맵 파일에 ignoreList 필드를 추가하여 DevTools가 빌드된 파일을 자동으로 무시하도록 합니다

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const distDir = join(import.meta.dir, '../dist');

/**
 * Add ignoreList to a sourcemap file / 소스맵 파일에 ignoreList 추가
 */
async function addIgnoreListToSourcemap(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const sourcemap = JSON.parse(content);

    // Check if sources array exists / sources 배열이 존재하는지 확인
    if (!sourcemap.sources || !Array.isArray(sourcemap.sources)) {
      console.log(`⚠️ Skipping ${filePath}: no sources array`);
      return;
    }

    // Find indices of files that should be ignored / 무시해야 할 파일의 인덱스 찾기
    // We want to ignore all sources in this sourcemap since they're from bundled output
    // 이 소스맵의 모든 소스를 무시합니다 (번들된 출력이므로)
    const ignoreIndices: number[] = [];
    sourcemap.sources.forEach((source: string, index: number) => {
      // Ignore all sources in this bundled file / 이 번들 파일의 모든 소스 무시
      // The sourcemap itself is for a dist file, so all its sources should be ignored
      // 소스맵 자체가 dist 파일용이므로 모든 소스를 무시해야 합니다
      ignoreIndices.push(index);
    });

    // Add ignoreList if there are files to ignore / 무시할 파일이 있으면 ignoreList 추가
    if (ignoreIndices.length > 0) {
      sourcemap.ignoreList = ignoreIndices;
      await writeFile(filePath, JSON.stringify(sourcemap, null, 2), 'utf-8');
      console.log(`✅ Added ignoreList to ${filePath} (${ignoreIndices.length} sources)`);
    } else {
      console.log(`ℹ️ No dist files to ignore in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

/**
 * Recursively find and process all .map files / 재귀적으로 모든 .map 파일 찾아서 처리
 */
async function processSourcemaps(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await processSourcemaps(fullPath);
      } else if (entry.name.endsWith('.map')) {
        await addIgnoreListToSourcemap(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}:`, error);
  }
}

// Main execution / 메인 실행
console.log('🔨 Adding ignoreList to sourcemaps...');
await processSourcemaps(distDir);
console.log('✅ Done!');
