/**
 * Set MCP server command to current user's mise path / 사용자 mise 경로로 MCP command 설정
 *
 * Run from repo root: bun run .cursor/scripts/set-mcp-mise-path.ts
 * Works on macOS, Linux, and Windows.
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const MCP_JSON_PATH = path.join(process.cwd(), '.cursor', 'mcp.json');

function findMisePath(): string | null {
  // Try "mise which mise" without shell first (returns path directly when PATH has mise)
  const which = spawnSync('mise', ['which', 'mise'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: process.env.PATH ?? '' },
  });
  if (which.status === 0 && which.stdout?.trim()) {
    const out = which.stdout.trim();
    const line = out.split('\n')[0]?.trim();
    if (line && (path.isAbsolute(line) || line.includes('mise'))) {
      return line;
    }
  }

  // Fallback: common install locations
  const home = os.homedir();
  const platform = os.platform();

  const candidates: string[] =
    platform === 'win32'
      ? [
          path.join(home, '.local', 'bin', 'mise.exe'),
          path.join(home, '.local', 'bin', 'mise.cmd'),
          path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'mise', 'mise.exe'),
          path.join(home, 'AppData', 'Local', 'Programs', 'mise', 'mise.exe'),
        ]
      : [path.join(home, '.local', 'bin', 'mise'), '/opt/homebrew/bin/mise', '/usr/local/bin/mise'];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // skip
    }
  }

  return null;
}

function main(): void {
  const misePath = findMisePath();
  if (!misePath) {
    console.error(
      'mise not found. Install mise (https://mise.jdx.dev/) and run this script again from the repo root.'
    );
    process.exit(1);
  }

  let mcp: { mcpServers?: Record<string, { command?: string; args?: string[] }> };
  try {
    const raw = fs.readFileSync(MCP_JSON_PATH, 'utf8');
    mcp = JSON.parse(raw) as typeof mcp;
  } catch (e) {
    console.error('Failed to read .cursor/mcp.json:', e);
    process.exit(1);
  }

  if (!mcp.mcpServers) {
    console.error('.cursor/mcp.json has no mcpServers.');
    process.exit(1);
  }

  let updated = 0;
  const MISE_SERVER_KEYS = new Set(['tauri', 'maestro']);
  for (const key of Object.keys(mcp.mcpServers)) {
    if (!MISE_SERVER_KEYS.has(key)) continue;
    const server = mcp.mcpServers[key];
    if (server && typeof server.command === 'string') {
      server.command = misePath;
      updated += 1;
    }
  }

  try {
    fs.writeFileSync(MCP_JSON_PATH, JSON.stringify(mcp, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.error('Failed to write .cursor/mcp.json:', e);
    process.exit(1);
  }

  console.log(`Updated ${updated} MCP server(s) to use: ${misePath}`);
}

main();
