import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

interface Client {
  id: string;
  ws: WebSocket;
  url?: string;
  title?: string;
  favicon?: string;
  ua?: string;
  time?: string;
}

interface DevTools {
  id: string;
  ws: WebSocket;
  clientId?: string;
}

class SocketServer {
  private clients: Map<string, Client> = new Map();
  private devtools: Map<string, DevTools> = new Map();
  private wss: WebSocketServer;

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
  }

  initSocketServer(server: ReturnType<typeof createServer>) {
    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      const pathname = url.pathname.replace('/remote/debug', '');
      const [, from, id] = pathname.split('/');

      if (from !== 'devtools' && from !== 'client') {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        const searchParams = url.searchParams;

        if (from === 'client') {
          this.createClientSocketConnect(ws, {
            id,
            url: searchParams.get('url') || undefined,
            ua: searchParams.get('ua') || undefined,
            time: searchParams.get('time') || undefined,
            title: searchParams.get('title') || undefined,
            favicon: searchParams.get('favicon') || undefined,
          });
        } else {
          this.createDevtoolsSocketConnect(ws, {
            id,
            clientId: searchParams.get('clientId') || undefined,
          });
        }
      });
    });
  }

  private createClientSocketConnect(ws: WebSocket, connectInfo: Omit<Client, 'ws'>) {
    const { id } = connectInfo;
    console.log(`[client] ${id} connected`);

    const client: Client = { ws, ...connectInfo };
    this.clients.set(id, client);

    const sendToDevtools = (message: Buffer | string) => {
      this.devtools.forEach((devtool) => {
        if (devtool.clientId === id) {
          devtool.ws.send(message);
        }
      });
    };

    ws.on('message', sendToDevtools);

    ws.on('close', () => {
      console.log(`[client] ${id} disconnected`);
      this.clients.delete(id);
      // 클라이언트가 연결 해제되면 해당 DevTools 연결도 종료
      this.devtools.forEach((devtool) => {
        if (devtool.clientId === id) {
          devtool.ws.close();
          this.devtools.delete(devtool.id);
        }
      });
    });
  }

  private createDevtoolsSocketConnect(ws: WebSocket, connectInfo: Omit<DevTools, 'ws'>) {
    const { id, clientId } = connectInfo;
    console.log(`[devtools] ${id} connected`);

    const devtool: DevTools = { ws, ...connectInfo };
    this.devtools.set(id, devtool);

    const client = clientId ? this.clients.get(clientId) : undefined;

    ws.on('close', () => {
      console.log(`[devtools] ${id} disconnected`);
      this.devtools.delete(id);
    });

    if (!client) {
      return;
    }

    ws.on('message', (message) => {
      client.ws.send(message);
    });
  }

  getClients() {
    return Array.from(this.clients.values()).map(({ ws, ...data }) => data);
  }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const HOST = process.env.HOST || '0.0.0.0';

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ targets: socketServer.getClients() }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const socketServer = new SocketServer();
socketServer.initSocketServer(server);

server.listen(PORT, HOST, () => {
  console.log(`Server started at http://${HOST}:${PORT}`);
});
