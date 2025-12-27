// HTTP API tests / HTTP API 테스트
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { SocketServer } from '../index';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('HTTP API', () => {
  let socketServer: SocketServer;
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(() => {
    socketServer = new SocketServer();
    httpServer = createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      // CORS headers / CORS 헤더
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      // Handle OPTIONS request / OPTIONS 요청 처리
      if (req.method === 'OPTIONS') {
        res.writeHead(200, headers);
        res.end();
        return;
      }

      if (url.pathname === '/json') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ targets: socketServer.getAllClients() }));
        return;
      }

      if (url.pathname === '/json/clients') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ clients: socketServer.getAllClients() }));
        return;
      }

      if (url.pathname === '/json/inspectors') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ inspectors: socketServer.getAllInspectors() }));
        return;
      }

      if (url.pathname.startsWith('/json/client/')) {
        const clientId = url.pathname.replace('/json/client/', '');
        const client = socketServer.getClient(clientId);
        if (client) {
          res.writeHead(200, headers);
          res.end(JSON.stringify({ client }));
        } else {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ error: 'Client not found' }));
        }
        return;
      }

      if (url.pathname === '/client.js') {
        try {
          const clientScriptPath = join(__dirname, '../../client/dist/index.js');
          const clientScript = readFileSync(clientScriptPath, 'utf-8');
          res.writeHead(200, {
            ...headers,
            'Content-Type': 'application/javascript', // Override Content-Type / Content-Type 덮어쓰기
          });
          res.end(clientScript);
        } catch {
          res.writeHead(200, {
            ...headers,
            'Content-Type': 'application/javascript', // Override Content-Type / Content-Type 덮어쓰기
          });
          res.end(`console.error('Client script not found');`);
        }
        return;
      }

      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: 'Not Found' }));
    });
    socketServer.initSocketServer(httpServer);
    port = 0; // Let OS assign port / OS가 포트 할당하도록
  });

  afterEach((done) => {
    // Clean up server after each test / 각 테스트 후 서버 정리
    if (httpServer.listening) {
      httpServer.close(() => {
        done();
      });
    } else {
      done();
    }
  });

  test('GET /json should return clients / GET /json은 클라이언트 반환', async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.listen(0, async () => {
        try {
          const address = httpServer.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Invalid server address'));
            return;
          }
          const response = await fetch(`http://localhost:${address.port}/json`);
          expect(response.status).toBe(200);
          const data = (await response.json()) as { targets: unknown[] };
          expect(data).toHaveProperty('targets');
          expect(Array.isArray(data.targets)).toBe(true);
          httpServer.close(() => resolve());
        } catch (error) {
          httpServer.close(() => reject(error));
        }
      });
    });
  });

  test('GET /json/clients should return clients with details / GET /json/clients는 상세 정보와 함께 클라이언트 반환', async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.listen(0, async () => {
        try {
          const address = httpServer.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Invalid server address'));
            return;
          }
          const response = await fetch(`http://localhost:${address.port}/json/clients`);
          expect(response.status).toBe(200);
          const data = (await response.json()) as { clients: unknown[] };
          expect(data).toHaveProperty('clients');
          expect(Array.isArray(data.clients)).toBe(true);
          httpServer.close(() => resolve());
        } catch (error) {
          httpServer.close(() => reject(error));
        }
      });
    });
  });

  test('GET /json/inspectors should return inspectors / GET /json/inspectors는 Inspector 반환', async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.listen(0, async () => {
        try {
          const address = httpServer.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Invalid server address'));
            return;
          }
          const response = await fetch(`http://localhost:${address.port}/json/inspectors`);
          expect(response.status).toBe(200);
          const data = (await response.json()) as { inspectors: unknown[] };
          expect(data).toHaveProperty('inspectors');
          expect(Array.isArray(data.inspectors)).toBe(true);
          httpServer.close(() => resolve());
        } catch (error) {
          httpServer.close(() => reject(error));
        }
      });
    });
  });

  test('GET /json/client/:id should return 404 for non-existent client / 존재하지 않는 클라이언트에 대해 404 반환', async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.listen(0, async () => {
        try {
          const address = httpServer.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Invalid server address'));
            return;
          }
          const response = await fetch(`http://localhost:${address.port}/json/client/non-existent`);
          expect(response.status).toBe(404);
          const data = await response.json();
          expect(data).toHaveProperty('error');
          httpServer.close(() => resolve());
        } catch (error) {
          httpServer.close(() => reject(error));
        }
      });
    });
  });

  test('GET /client.js should return JavaScript / GET /client.js는 JavaScript 반환', async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.listen(0, async () => {
        try {
          const address = httpServer.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Invalid server address'));
            return;
          }
          const response = await fetch(`http://localhost:${address.port}/client.js`);
          expect(response.status).toBe(200);
          expect(response.headers.get('content-type')).toContain('application/javascript');
          httpServer.close(() => resolve());
        } catch (error) {
          httpServer.close(() => reject(error));
        }
      });
    });
  });

  test('OPTIONS request should return CORS headers / OPTIONS 요청은 CORS 헤더 반환', async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.listen(0, async () => {
        try {
          const address = httpServer.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Invalid server address'));
            return;
          }
          const response = await fetch(`http://localhost:${address.port}/json`, {
            method: 'OPTIONS',
          });
          expect(response.status).toBe(200);
          expect(response.headers.get('access-control-allow-origin')).toBe('*');
          httpServer.close(() => resolve());
        } catch (error) {
          httpServer.close(() => reject(error));
        }
      });
    });
  });

  test('GET /unknown should return 404 / GET /unknown은 404 반환', async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.listen(0, async () => {
        try {
          const address = httpServer.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Invalid server address'));
            return;
          }
          const response = await fetch(`http://localhost:${address.port}/unknown`);
          expect(response.status).toBe(404);
          const data = await response.json();
          expect(data).toHaveProperty('error');
          httpServer.close(() => resolve());
        } catch (error) {
          httpServer.close(() => reject(error));
        }
      });
    });
  });
});
