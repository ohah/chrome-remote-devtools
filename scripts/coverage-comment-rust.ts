#!/usr/bin/env bun
// Generate coverage report comment for Rust tests using cargo-llvm-cov / cargo-llvm-cov를 사용한 Rust 테스트 커버리지 리포트 댓글 생성
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface CoverageFile {
  file: string;
  funcs: number;
  lines: number;
  branches: number;
  uncovered: string;
}

interface LCOVRecord {
  file: string;
  functions: { name: string; line: number }[];
  lines: { line: number; hits: number }[];
  branches: { line: number; hits: number }[];
}

/**
 * Parse LCOV format / LCOV 형식 파싱
 */
function parseLCOV(lcovPath: string): {
  summary: { funcs: number; lines: number; branches: number };
  files: CoverageFile[];
} {
  const content = readFileSync(lcovPath, 'utf-8');
  const records: LCOVRecord[] = [];
  let currentRecord: Partial<LCOVRecord> | null = null;

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('SF:')) {
      // Source file / 소스 파일
      if (currentRecord) {
        records.push(currentRecord as LCOVRecord);
      }
      currentRecord = {
        file: line.substring(3),
        functions: [],
        lines: [],
        branches: [],
      };
    } else if (line.startsWith('FN:')) {
      // Function definition / 함수 정의
      const match = line.match(/^FN:(\d+),(.+)$/);
      if (match && currentRecord && currentRecord.functions) {
        currentRecord.functions.push({
          line: parseInt(match[1]),
          name: match[2],
        });
      }
    } else if (line.startsWith('FNDA:')) {
      // Function data (hits) / 함수 데이터 (실행 횟수)
      // This is handled separately / 별도로 처리됨
    } else if (line.startsWith('DA:')) {
      // Line data / 라인 데이터
      const match = line.match(/^DA:(\d+),(\d+)$/);
      if (match && currentRecord && currentRecord.lines) {
        currentRecord.lines.push({
          line: parseInt(match[1]),
          hits: parseInt(match[2]),
        });
      }
    } else if (line.startsWith('BRDA:')) {
      // Branch data / 브랜치 데이터
      const match = line.match(/^BRDA:(\d+),(\d+),(\d+),(-?\d+)$/);
      if (match && currentRecord && currentRecord.branches) {
        const hits = match[4] === '-' ? 0 : parseInt(match[4]);
        currentRecord.branches.push({
          line: parseInt(match[1]),
          hits,
        });
      }
    } else if (line === 'end_of_record') {
      // End of record / 레코드 끝
      if (currentRecord) {
        records.push(currentRecord as LCOVRecord);
        currentRecord = null;
      }
    }
  }

  // Add last record if exists / 마지막 레코드 추가
  if (currentRecord) {
    records.push(currentRecord as LCOVRecord);
  }

  // Calculate coverage / 커버리지 계산
  let totalLines = 0;
  let coveredLines = 0;
  let totalFuncs = 0;
  let coveredFuncs = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  const files: CoverageFile[] = [];

  for (const record of records) {
    // Skip test files / 테스트 파일 제외
    if (
      record.file.includes('test') ||
      record.file.includes('__tests__') ||
      record.file.includes('.test.')
    ) {
      continue;
    }

    const fileLines = record.lines.length;
    const fileCoveredLines = record.lines.filter((l) => l.hits > 0).length;
    const fileFuncs = record.functions.length;
    const fileCoveredFuncs = record.functions.length; // Simplified / 단순화
    const fileBranches = record.branches.length;
    const fileCoveredBranches = record.branches.filter((b) => b.hits > 0).length;

    totalLines += fileLines;
    coveredLines += fileCoveredLines;
    totalFuncs += fileFuncs;
    coveredFuncs += fileCoveredFuncs;
    totalBranches += fileBranches;
    coveredBranches += fileCoveredBranches;

    // Get uncovered lines / 커버되지 않은 라인 가져오기
    const uncoveredLines = record.lines
      .filter((l) => l.hits === 0)
      .map((l) => l.line)
      .sort((a, b) => a - b);

    files.push({
      file: record.file.replace(process.cwd() + '/', ''),
      funcs: fileLines > 0 ? (fileCoveredLines / fileLines) * 100 : 0,
      lines: fileLines > 0 ? (fileCoveredLines / fileLines) * 100 : 0,
      branches: fileBranches > 0 ? (fileCoveredBranches / fileBranches) * 100 : 0,
      uncovered: formatUncoveredLines(uncoveredLines),
    });
  }

  const summary = {
    funcs: totalFuncs > 0 ? (coveredFuncs / totalFuncs) * 100 : 0,
    lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
    branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
  };

  return { summary, files };
}

/**
 * Format uncovered lines as ranges / 커버되지 않은 라인을 범위로 포맷팅
 */
function formatUncoveredLines(lines: number[]): string {
  if (lines.length === 0) return 'N/A';
  if (lines.length === 1) return lines[0].toString();

  const ranges: string[] = [];
  let start = lines[0];
  let end = lines[0];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === end + 1) {
      end = lines[i];
    } else {
      if (start === end) {
        ranges.push(start.toString());
      } else {
        ranges.push(`${start}-${end}`);
      }
      start = lines[i];
      end = lines[i];
    }
  }

  // 마지막 범위 추가 / Add last range
  if (start === end) {
    ranges.push(start.toString());
  } else {
    ranges.push(`${start}-${end}`);
  }

  // 최대 100자로 제한 / Limit to 100 chars
  const result = ranges.join(', ');
  return result.length > 100 ? result.substring(0, 97) + '...' : result;
}

/**
 * Format coverage as markdown comment / 커버리지를 마크다운 댓글 형식으로 변환
 */
function formatCoverageComment(
  summary: { funcs: number; lines: number; branches: number },
  files: CoverageFile[],
  packageName: string
): string {
  const comment = `## 📊 Test Coverage Report - ${packageName}

### Summary

| Metric | Coverage |
|--------|----------|
| **Lines** | **${summary.lines.toFixed(2)}%** |
| **Functions** | **${summary.funcs.toFixed(2)}%** |
| **Branches** | **${summary.branches.toFixed(2)}%** |

### File Coverage

<details>
<summary>Click to expand</summary>

| File | Lines | Functions | Branches | Uncovered Lines |
|------|-------|-----------|----------|-----------------|
${files
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 50) // Limit to top 50 files
  .map(
    (f) =>
      `| \`${f.file}\` | ${f.lines.toFixed(2)}% | ${f.funcs.toFixed(2)}% | ${f.branches.toFixed(2)}% | ${f.uncovered} |`
  )
  .join('\n')}

</details>

---

*Generated by Rust test coverage script (cargo-llvm-cov)*
`;

  return comment;
}

/**
 * Main function / 메인 함수
 */
async function main() {
  const lcovPath = join(process.cwd(), 'coverage', 'lcov.info');

  try {
    const { summary, files } = parseLCOV(lcovPath);
    const comment = formatCoverageComment(summary, files, 'Server');

    // Write to file / 파일에 작성
    const outputPath = join(process.cwd(), 'coverage-comment.md');
    writeFileSync(outputPath, comment, 'utf-8');

    console.log(`\n✅ Coverage comment generated: ${outputPath}`);
    console.log('\n' + comment);
  } catch (error) {
    console.error(`Failed to generate coverage:`, error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
