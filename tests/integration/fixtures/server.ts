// Server fixture for tests / 테스트용 서버 픽스처
import { test as base } from '@playwright/test';
import { WebSocket } from 'ws';

interface ServerFixture {
  serverUrl: string;
  wsUrl: string;
}

export const test = base.extend<ServerFixture>({
  serverUrl: async ({}, use) => {
    await use('http://localhost:8080');
  },

  wsUrl: async ({}, use) => {
    await use('ws://localhost:8080');
  },
});

export { expect } from '@playwright/test';
