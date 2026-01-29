#!/usr/bin/env node
// Custom Metro server that injects Host header for requests that lack it / Host 헤더가 없는 요청에 Host 헤더를 주입하는 커스텀 Metro 서버
// Use when you see "Error: No host header was found" from Metro / Metro에서 "No host header was found" 오류가 날 때 사용
// Run from examples/react-native: node scripts/start-with-host.js or bun run start:with-host / examples/react-native에서 실행

const path = require('path');
const http = require('http');

const projectRoot = path.resolve(__dirname, '..');
const port = process.env.RCT_METRO_PORT || 8081;
const host = process.env.RCT_METRO_HOST || 'localhost';

async function main() {
  process.chdir(projectRoot);
  const Metro = require('metro');
  const config = await Metro.loadConfig({ projectRoot });
  const metroBundlerServer = await Metro.runMetro(config);

  const server = http.createServer((req, res) => {
    if (!req.headers.host) {
      req.headers.host = `${host}:${port}`;
    }
    metroBundlerServer.processRequest(req, res);
  });

  server.listen(port, host, () => {
    console.log(`Metro (with Host header fallback) listening on ${host}:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
