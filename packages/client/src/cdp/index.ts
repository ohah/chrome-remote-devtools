// ChromeDomain - CDP domain registration and message routing / CDP 도메인 등록 및 메시지 라우팅
import {
  Runtime,
  Page,
  Dom,
  Network,
  Console,
  DOMStorage,
  Storage,
  SessionReplay,
  protocol,
} from './domain';

interface CDPMessage {
  id?: number;
  method?: string;
  params?: unknown;
}

export default class ChromeDomain {
  private protocol: Record<string, (...args: unknown[]) => unknown> = {};

  constructor(options: { socket: WebSocket }) {
    this.registerProtocol(options);
  }

  /**
   * Execute CDP method / CDP 메서드 실행
   */
  execute(message: CDPMessage = {}): { id?: number; result?: unknown; error?: unknown } {
    const { id, method, params } = message;
    if (!method) {
      return { id };
    }

    const methodCall = this.protocol[method];
    if (typeof methodCall !== 'function') {
      return { id };
    }

    try {
      return { id, result: methodCall(params) };
    } catch (error) {
      return {
        id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Register all CDP domains / 모든 CDP 도메인 등록
   */
  private registerProtocol(options: { socket: WebSocket }): void {
    const domains = [
      new Runtime(options),
      new Page(options),
      new Dom(options),
      new Network(options),
      new Console(options),
      new DOMStorage(options),
      new Storage(options),
      new SessionReplay(options),
    ];

    domains.forEach((domain) => {
      const { namespace } = domain;
      const cmds = protocol[namespace as keyof typeof protocol];
      if (cmds) {
        cmds.forEach((cmd) => {
          const methodName = `${namespace}.${cmd}`;
          const method = domain[cmd];
          if (typeof method === 'function') {
            this.protocol[methodName] = method.bind(domain);
          }
        });
      }
    });
  }
}
