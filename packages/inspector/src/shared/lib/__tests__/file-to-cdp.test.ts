// File to CDP message converter tests / 파일을 CDP 메시지로 변환하는 유틸리티 테스트
import { describe, test, expect } from 'bun:test';
import { fileToCDPMessages, readCDPFile } from '../file-to-cdp';
import type { PostMessageCDPMessage, CDPEventFile } from '../file-to-cdp';

describe('fileToCDPMessages', () => {
  test('should return CDP messages from valid file / 유효한 파일에서 CDP 메시지 배열 반환', async () => {
    const testData: CDPEventFile = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [
        {
          type: 'CDP_MESSAGE',
          message: '{"method":"Network.responseReceived","params":{}}',
        },
        {
          type: 'CDP_MESSAGE',
          message: '{"method":"DOM.setChildNodes","params":{}}',
        },
      ],
    };

    const file = new File([JSON.stringify(testData)], 'test.json', {
      type: 'application/json',
    });

    const messages = await fileToCDPMessages(file);

    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe('CDP_MESSAGE');
    expect(messages[0].message).toBe('{"method":"Network.responseReceived","params":{}}');
    expect(messages[1].message).toBe('{"method":"DOM.setChildNodes","params":{}}');
  });

  test('should throw error for invalid file format / 잘못된 형식의 파일에서 에러 발생', async () => {
    const invalidData = {
      version: '1.0.0',
      // Missing events field / events 필드 누락
    };

    const file = new File([JSON.stringify(invalidData)], 'test.json', {
      type: 'application/json',
    });

    await expect(fileToCDPMessages(file)).rejects.toThrow('Invalid file format');
  });

  test('should filter out non-postMessage format events / postMessage 형식이 아닌 이벤트 필터링', async () => {
    const testData: CDPEventFile = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [
        {
          type: 'CDP_MESSAGE',
          message: '{"method":"Network.responseReceived","params":{}}',
        },
        {
          type: 'INVALID_TYPE',
          message: '{"method":"DOM.setChildNodes","params":{}}',
        } as PostMessageCDPMessage,
        {
          type: 'CDP_MESSAGE',
          // Missing message field / message 필드 누락
        } as PostMessageCDPMessage,
      ],
    };

    const file = new File([JSON.stringify(testData)], 'test.json', {
      type: 'application/json',
    });

    const messages = await fileToCDPMessages(file);

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toBe('{"method":"Network.responseReceived","params":{}}');
  });
});

describe('readCDPFile', () => {
  test('should return full file data including optional fields / 전체 파일 데이터 반환 (cookies, localStorage, sessionStorage, domTree 포함)', async () => {
    const testData: CDPEventFile = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [
        {
          type: 'CDP_MESSAGE',
          message: '{"method":"Network.responseReceived","params":{}}',
        },
      ],
      cookies: [
        {
          name: 'test',
          value: 'cookie',
          domain: 'localhost',
          path: '/',
        },
      ],
      localStorage: [['key1', 'value1']],
      sessionStorage: [['sessionKey', 'sessionValue']],
      domTree: {
        documentURL: 'http://localhost:1420',
        baseURL: 'http://localhost:1420',
        html: '<html><head><title>Test</title></head><body><div>Test</div></body></html>',
      },
    };

    const file = new File([JSON.stringify(testData)], 'test.json', {
      type: 'application/json',
    });

    const data = await readCDPFile(file);

    expect(data.version).toBe('1.0.0');
    expect(data.clientId).toBe('test-client');
    expect(data.events).toHaveLength(1);
    expect(data.cookies).toHaveLength(1);
    expect(data.cookies?.[0].name).toBe('test');
    expect(data.localStorage).toHaveLength(1);
    expect(data.localStorage?.[0]).toEqual(['key1', 'value1']);
    expect(data.sessionStorage).toHaveLength(1);
    expect(data.sessionStorage?.[0]).toEqual(['sessionKey', 'sessionValue']);
    expect(data.domTree?.html).toBe(
      '<html><head><title>Test</title></head><body><div>Test</div></body></html>'
    );
  });

  test('should throw error when required fields are missing / 필수 필드 누락 시 에러 발생', async () => {
    const invalidData = {
      version: '1.0.0',
      // Missing events field / events 필드 누락
    };

    const file = new File([JSON.stringify(invalidData)], 'test.json', {
      type: 'application/json',
    });

    await expect(readCDPFile(file)).rejects.toThrow('Invalid file format');
  });
});
