#!/usr/bin/env bun
// Before build script for Tauri / Tauri 빌드 전 스크립트
// This script runs before Tauri build to ensure all dependencies are built / Tauri 빌드 전에 모든 의존성을 빌드하기 위해 실행되는 스크립트
const { $ } = require('bun');
const path = require('path');
const fs = require('fs');

// Get project root (3 levels up from src-tauri) / 프로젝트 루트 가져오기 (src-tauri에서 3단계 위)
// __dirname is src-tauri, so ../.. is packages/inspector, and ../../.. is project root
// __dirname은 src-tauri이므로, ../..는 packages/inspector이고, ../../..는 프로젝트 루트입니다
const projectRoot = path.join(__dirname, '../../..');

console.log('🔨 Building client...');
try {
  await $`bun run build:client`.cwd(projectRoot);
  console.log('✅ Client built successfully');
} catch (error) {
  console.error('❌ Failed to build client:', error);
  process.exit(1);
}

console.log('🔨 Building inspector...');
try {
  // Use bun run --filter to build inspector / bun run --filter를 사용하여 inspector 빌드
  await $`bun run --filter='@ohah/chrome-remote-devtools-inspector' build`.cwd(projectRoot);
  console.log('✅ Inspector built successfully');
} catch (error) {
  console.error('❌ Failed to build inspector:', error);
  process.exit(1);
}

console.log('📦 Copying client.js to resources...');
try {
  const fs = require('fs');
  const src = path.join(projectRoot, 'packages/client/dist/index.global.js');
  const dest = path.join(__dirname, 'resources/index.global.js');

  if (!fs.existsSync(src)) {
    console.error(`Error: Client.js not found at ${src}`);
    console.error('Please build client first: cd packages/client && bun run build');
    process.exit(1);
  }

  // Create resources directory if it doesn't exist / resources 디렉토리가 없으면 생성
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy file / 파일 복사
  fs.copyFileSync(src, dest);
  console.log(`✅ Successfully copied client.js from ${src} to ${dest}`);
} catch (error) {
  console.error('❌ Failed to copy client.js:', error);
  process.exit(1);
}

console.log('✅ All build steps completed successfully');
