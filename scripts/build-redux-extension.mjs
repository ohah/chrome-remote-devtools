#!/usr/bin/env node
/**
 * Build Redux DevTools Extension and copy to devtools-frontend / Redux DevTools Extension 빌드 및 devtools-frontend로 복사
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const extensionDir = path.join(rootDir, 'reference', 'redux-devtools', 'extension');
const targetDir = path.join(
  rootDir,
  'devtools',
  'devtools-frontend',
  'front_end',
  'panels',
  'redux',
  'extension'
);

console.log('🔨 Building Redux DevTools Extension...');
console.log('');

// 1. Build extension / Extension 빌드
console.log('📦 Step 1: Building extension...');

try {
  const reduxDevToolsRoot = path.join(rootDir, 'reference', 'redux-devtools');

  // Install dependencies if needed / 필요시 의존성 설치
  if (!fs.existsSync(path.join(reduxDevToolsRoot, 'node_modules'))) {
    console.log('  Installing dependencies...');
    execSync('pnpm install', { stdio: 'inherit', cwd: reduxDevToolsRoot, shell: true });
  }

  // Build all packages first / 먼저 모든 패키지 빌드
  console.log('  Building packages...');
  execSync('pnpm run build:all', { stdio: 'inherit', cwd: reduxDevToolsRoot, shell: true });

  // Build extension / Extension 빌드
  execSync('pnpm run build:extension', { stdio: 'inherit', cwd: extensionDir, shell: true });
  console.log('  ✓ Extension built successfully');
} catch (error) {
  console.error('  ✗ Failed to build extension:', error.message);
  process.exit(1);
}

console.log('');

// 2. Copy built files to devtools-frontend / 빌드된 파일을 devtools-frontend로 복사
console.log('📋 Step 2: Copying built files to devtools-frontend...');

const distDir = path.join(extensionDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('  ✗ dist directory not found');
  process.exit(1);
}

// Create target directory / 대상 디렉토리 생성
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy required files / 필요한 파일 복사
const filesToCopy = [
  'devpanel.html',
  'devpanel.bundle.js',
  'devpanel.bundle.css',
  'background.bundle.js',
  'content.bundle.js',
  'page.bundle.js',
];

const dirsToCopy = ['img'];

// Copy files / 파일 복사
for (const file of filesToCopy) {
  const src = path.join(distDir, file);
  const dest = path.join(targetDir, file);

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${file}`);
  } else {
    console.warn(`  ⚠ ${file} not found, skipping...`);
  }
}

    // Copy directories / 디렉토리 복사
    for (const dir of dirsToCopy) {
      const src = path.join(distDir, dir);
      const dest = path.join(targetDir, dir);

      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
        console.log(`  ✓ Copied ${dir}/`);
      } else {
        console.warn(`  ⚠ ${dir}/ not found, skipping...`);
      }
    }

    console.log('');

    // 3. Fix paths in devpanel.html / devpanel.html의 경로 수정
    console.log('🔧 Step 3: Fixing paths in devpanel.html...');
    const devpanelHtmlPath = path.join(targetDir, 'devpanel.html');
    if (fs.existsSync(devpanelHtmlPath)) {
      let htmlContent = fs.readFileSync(devpanelHtmlPath, 'utf-8');

      // Replace absolute paths with relative paths / 절대 경로를 상대 경로로 변경
      htmlContent = htmlContent.replace(/src="\/img\//g, 'src="img/');
      htmlContent = htmlContent.replace(/href="\/devpanel\.bundle\.css"/g, 'href="devpanel.bundle.css"');
      htmlContent = htmlContent.replace(/src="\/devpanel\.bundle\.js"/g, 'src="devpanel.bundle.js"');

      fs.writeFileSync(devpanelHtmlPath, htmlContent, 'utf-8');
      console.log('  ✓ Fixed paths in devpanel.html');
    } else {
      console.warn('  ⚠ devpanel.html not found, skipping path fix...');
    }

    console.log('');
    console.log('✅ Redux DevTools Extension built and copied successfully!');
    console.log(`   Target: ${targetDir}`);
