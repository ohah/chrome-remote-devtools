#!/usr/bin/env bun
// Generate release notes from commits since previous tag / 이전 태그 이후 커밋으로 릴리즈 노트 생성
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

const PACKAGE_TAG_PREFIX: Record<string, string> = {
  'rn-inspector': 'chrome-remote-devtools-rn-inspector-v',
  client: 'chrome-remote-devtools-client-v',
  server: 'chrome-remote-devtools-server-v',
};

const PACKAGE_PATHS: Record<string, string> = {
  'rn-inspector': 'packages/react-native-inspector',
  client: 'packages/client',
  server: 'packages/server',
};

const PACKAGE_LABELS: Record<string, string> = {
  'rn-inspector': 'React Native Inspector',
  client: 'Client',
  server: 'Server',
};

const noPrLinks = process.argv.includes('--no-pr-links');
const args = process.argv.filter((a) => a !== '--no-pr-links');
const packageKey = args[2] || 'rn-inspector';
const version = args[3];
if (!version) {
  console.error('Usage: bun scripts/release-notes.ts [--no-pr-links] <package-key> <version>');
  console.error('  package-key: rn-inspector | client | server');
  console.error('  --no-pr-links: skip GitHub API calls for PR links (faster, no gh auth needed)');
  process.exit(1);
}

const tagPrefix = PACKAGE_TAG_PREFIX[packageKey];
const path = PACKAGE_PATHS[packageKey];
const label = PACKAGE_LABELS[packageKey];

// List tags for this package, sorted by version (newest last for semver)
const tagsOut = execSync(`git tag -l '${tagPrefix}*' --sort=-v:refname`, { encoding: 'utf-8' });
const tags = tagsOut.trim() ? tagsOut.trim().split('\n') : [];
// Current release tag (we're writing notes for it)
const currentTag = `${tagPrefix}${version}`;
// Previous tag = first in list that is not the current (in case we already tagged)
const previousTag = tags.find((t) => t !== currentTag) || null;

// Repo URL for PR links / PR 링크용 저장소 URL
let repoUrl = 'https://github.com/ohah/chrome-remote-devtools';
try {
  const remote = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
  if (remote) {
    repoUrl = remote.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '');
  }
} catch {
  // keep default
}

const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
const maxCount = args[4] ? `-n ${args[4]}` : '';
const logOut = execSync(
  `git log ${range} ${maxCount} --format="%H %s%n%b" --no-decorate -- ${path}`.trim(),
  {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
  }
);
// Split by commit (full hash 40 chars + space + subject)
const rawCommits = logOut.trim() ? logOut.trim().split(/\n(?=[a-f0-9]{40} )/) : [];

// Use ohah for GitHub API (repo owner; see AGENTS.md) / PR 링크 조회 시 ohah 계정 사용
let previousGhUser: string | null = null;
if (!noPrLinks) {
  try {
    previousGhUser = execSync('gh api user -q .login', { encoding: 'utf-8', shell: true }).trim();
    if (previousGhUser !== 'ohah') {
      execSync('gh auth switch --hostname github.com --user ohah', {
        stdio: 'inherit',
        shell: true,
      });
    } else {
      previousGhUser = null;
    }
  } catch {
    // gh not auth'd or not installed; continue without PR links
  }
}

const repoSlug = repoUrl.replace('https://github.com/', '').replace(/\/$/, '');
function getPrForCommit(commitSha: string): number | null {
  if (noPrLinks) return null;
  try {
    const out = execSync(
      `gh api repos/${repoSlug}/commits/${commitSha}/pulls --jq '.[0].number' 2>/dev/null`,
      {
        encoding: 'utf-8',
        maxBuffer: 4096,
        shell: true,
      }
    );
    const n = parseInt(out.trim(), 10);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

type Item = { text: string; prs: Set<number> };
type Group = { type: string; items: Map<string, Item> };
const groups: Record<string, Group> = {};
const typeOrder = ['feat', 'fix', 'docs', 'refactor', 'chore', 'style', 'test'];

for (const block of rawCommits) {
  const firstLine = block.split('\n')[0] ?? '';
  const rest = block.split('\n').slice(1).join('\n');
  const subjectMatch = firstLine.match(/^([a-f0-9]{40})\s+(.+)$/);
  const commitSha = subjectMatch ? subjectMatch[1] : '';
  const subject = subjectMatch ? subjectMatch[2].trim() : firstLine;
  const prInSubject = subject.match(/\(#(\d+)\)$/);
  const prInBody = rest.match(/\(#(\d+)\)/);
  let prNum: number | null = prInSubject
    ? parseInt(prInSubject[1], 10)
    : prInBody
      ? parseInt(prInBody[1], 10)
      : null;
  if (prNum == null && commitSha) prNum = getPrForCommit(commitSha);
  const subjectWithoutPr = subject.replace(/\s*\(#\d+\)\s*$/, '').trim();
  const scopeMatch = subjectWithoutPr.match(
    /^(feat|fix|docs|refactor|chore|style|test)(\([^)]+\))?:\s*(.+)$/i
  );
  const type = scopeMatch ? scopeMatch[1].toLowerCase() : 'chore';
  const text = scopeMatch ? scopeMatch[3].trim() : subjectWithoutPr;
  if (!groups[type]) groups[type] = { type, items: new Map() };
  const existing = groups[type].items.get(text);
  if (existing) {
    if (prNum != null) existing.prs.add(prNum);
  } else {
    const prs = new Set<number>();
    if (prNum != null) prs.add(prNum);
    groups[type].items.set(text, { text, prs });
  }
}

const sections: string[] = [];
for (const t of typeOrder) {
  if (!groups[t]) continue;
  const title =
    t === 'feat'
      ? 'Features'
      : t === 'fix'
        ? 'Fixes'
        : t === 'docs'
          ? 'Documentation'
          : t.charAt(0).toUpperCase() + t.slice(1);
  const bullets = [...groups[t].items.values()].map(({ text, prs }) => {
    const prLinks =
      prs.size > 0
        ? ' ' +
          [...prs]
            .sort((a, b) => a - b)
            .map((n) => `[#${n}](${repoUrl}/pull/${n})`)
            .join(' ')
        : '';
    return `- ${text}${prLinks}`;
  });
  sections.push(`### ${title}\n\n${bullets.join('\n')}`);
}

const since = previousTag ? ` (since ${previousTag})` : '';
const body = `## ${label} ${version}${since}\n\n${sections.length ? sections.join('\n\n') : '- No package-specific commits in this range.'}\n`;
const outPath = `release-notes-${packageKey}-${version}.md`;
writeFileSync(outPath, body, 'utf-8');

// Restore previous gh user / ohah 전환했으면 이전 계정으로 복구
if (previousGhUser) {
  try {
    execSync(`gh auth switch --hostname github.com --user ${previousGhUser}`, {
      stdio: 'inherit',
      shell: true,
    });
  } catch {
    // ignore
  }
}

console.log(`Wrote ${outPath}`);
console.log(body);
