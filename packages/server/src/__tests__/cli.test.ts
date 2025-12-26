// CLI parser tests / CLI 파서 테스트
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { parseCLIArgs, type CLIOptions } from '../cli';

describe('CLI Parser', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  test('should parse port option / 포트 옵션 파싱', () => {
    process.argv = ['node', 'script', '--port', '3000'];
    const options = parseCLIArgs();
    expect(options.port).toBe(3000);
  });

  test('should parse port option with short form / 짧은 형식 포트 옵션 파싱', () => {
    process.argv = ['node', 'script', '-p', '8080'];
    const options = parseCLIArgs();
    expect(options.port).toBe(8080);
  });

  test('should parse host option / 호스트 옵션 파싱', () => {
    process.argv = ['node', 'script', '--host', 'localhost'];
    const options = parseCLIArgs();
    expect(options.host).toBe('localhost');
  });

  test('should parse host option with short form / 짧은 형식 호스트 옵션 파싱', () => {
    process.argv = ['node', 'script', '-h', '127.0.0.1'];
    const options = parseCLIArgs();
    expect(options.host).toBe('127.0.0.1');
  });

  test('should parse SSL option / SSL 옵션 파싱', () => {
    process.argv = ['node', 'script', '--ssl'];
    const options = parseCLIArgs();
    expect(options.useSsl).toBe(true);
  });

  test('should parse certificate path / 인증서 경로 파싱', () => {
    process.argv = ['node', 'script', '--cert', '/path/to/cert.pem'];
    const options = parseCLIArgs();
    expect(options.sslCertPath).toBe('/path/to/cert.pem');
  });

  test('should parse key path / 키 경로 파싱', () => {
    process.argv = ['node', 'script', '--key', '/path/to/key.pem'];
    const options = parseCLIArgs();
    expect(options.sslKeyPath).toBe('/path/to/key.pem');
  });

  test('should parse log enabled option / 로그 활성화 옵션 파싱', () => {
    process.argv = ['node', 'script', '--log-enabled'];
    const options = parseCLIArgs();
    expect(options.logEnabled).toBe(true);
  });

  test('should parse log methods / 로그 메소드 파싱', () => {
    process.argv = ['node', 'script', '--log-methods', 'Runtime.evaluate,Page.navigate'];
    const options = parseCLIArgs();
    expect(options.logMethods).toBe('Runtime.evaluate,Page.navigate');
  });

  test('should parse log file path / 로그 파일 경로 파싱', () => {
    process.argv = ['node', 'script', '--log-file', './logs/server.log'];
    const options = parseCLIArgs();
    expect(options.logFile).toBe('./logs/server.log');
  });

  test('should parse multiple options / 여러 옵션 파싱', () => {
    process.argv = [
      'node',
      'script',
      '--port',
      '3000',
      '--host',
      'localhost',
      '--ssl',
      '--cert',
      '/path/to/cert.pem',
      '--key',
      '/path/to/key.pem',
      '--log-enabled',
    ];
    const options = parseCLIArgs();
    expect(options.port).toBe(3000);
    expect(options.host).toBe('localhost');
    expect(options.useSsl).toBe(true);
    expect(options.sslCertPath).toBe('/path/to/cert.pem');
    expect(options.sslKeyPath).toBe('/path/to/key.pem');
    expect(options.logEnabled).toBe(true);
  });

  test('should return empty options when no arguments / 인자가 없을 때 빈 옵션 반환', () => {
    process.argv = ['node', 'script'];
    const options = parseCLIArgs();
    expect(options).toEqual({});
  });

  test('should handle missing values for options that require values / 값이 필요한 옵션에 값이 없을 때 처리', () => {
    process.argv = ['node', 'script', '--port'];
    const options = parseCLIArgs();
    expect(options.port).toBeUndefined();
  });

  test('should handle unknown options / 알 수 없는 옵션 처리', () => {
    process.argv = ['node', 'script', '--unknown', 'value'];
    const options = parseCLIArgs();
    expect(options).toEqual({});
  });
});
