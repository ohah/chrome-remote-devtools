#!/usr/bin/env bun
// Tag and push to trigger npm publish workflow for react-native-inspector / react-native-inspector npm 배포 워크플로우 트리거용 태그 생성 및 푸시
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const pkgPath = resolve(import.meta.dir, '../packages/react-native-inspector/package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const version = pkg.version as string;
if (!version) {
  console.error('Missing version in packages/react-native-inspector/package.json');
  process.exit(1);
}

const tag = `chrome-remote-devtools-rn-inspector-v${version}`;
const dryRun = process.argv.includes('--dry-run');
if (dryRun) {
  console.log('[dry-run] Would create tag:', tag);
  console.log('[dry-run] Would run: git tag', tag);
  console.log('[dry-run] Would run: git push origin', tag);
  process.exit(0);
}
console.log(`Creating tag ${tag} and pushing...`);
execSync(`git tag ${tag}`, { stdio: 'inherit' });
execSync(`git push origin ${tag}`, { stdio: 'inherit' });
console.log('Done. Publish workflow will run on the tag push.');
