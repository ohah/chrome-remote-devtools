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
import type BaseDomain from './domain/base';
import type { CDPMessage, CDPResponse, DomainOptions } from './types';

export default class ChromeDomain {
  private protocol: Record<string, (...args: unknown[]) => unknown> = {};
  private domains: BaseDomain[] = [];
  private eventStorage: DomainOptions['eventStorage'];

  constructor(options: DomainOptions) {
    this.eventStorage = options.eventStorage;
    this.registerProtocol(options);
  }

  /**
   * Set DevTools window for postMessage communication / postMessage 통신을 위한 DevTools window 설정
   * @param devtoolsWindow - DevTools window reference / DevTools window 참조
   */
  setDevToolsWindow(devtoolsWindow: Window): void {
    // Update all domains with DevTools window / 모든 도메인에 DevTools window 업데이트
    this.domains.forEach((domain) => {
      domain.setDevToolsWindow(devtoolsWindow);
    });
  }

  /**
   * Execute CDP method / CDP 메서드 실행
   */
  execute(message: CDPMessage = {}): CDPResponse | Promise<CDPResponse> {
    const { id, method, params } = message;
    if (!method) {
      return { id };
    }

    // Save command to storage if eventStorage is available / eventStorage가 있으면 명령 저장
    if (this.eventStorage && method) {
      void this.eventStorage.saveMessage({ id, method, params });
    }

    const methodCall = this.protocol[method];
    if (typeof methodCall !== 'function') {
      return { id };
    }

    try {
      const result = methodCall(params);
      // Handle async methods / async 메서드 처리
      if (result instanceof Promise) {
        return result
          .then((res) => ({ id, result: res }))
          .catch((error) => ({
            id,
            error: {
              code: -32000,
              message: error instanceof Error ? error.message : String(error),
            },
          }));
      }
      return { id, result };
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
  private registerProtocol(options: DomainOptions): void {
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

    // Store domains for later DevTools window updates / 나중에 DevTools window 업데이트를 위해 도메인 저장
    this.domains = domains;

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

  /**
   * Get event storage instance / 이벤트 저장소 인스턴스 가져오기
   */
  getEventStorage(): DomainOptions['eventStorage'] {
    return this.eventStorage;
  }
}
