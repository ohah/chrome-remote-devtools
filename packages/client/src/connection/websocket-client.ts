// WebSocket client for CDP communication / CDP 통신을 위한 WebSocket 클라이언트
import ChromeDomain from '../cdp';
import { EventStorage } from '../persistence/event-storage';
import type { RrwebConfig } from '../config/rrweb-config';
import { getId } from '../utils/debug-id';
import { getQuery } from '../utils/page-info';

/**
 * WebSocket client class / WebSocket 클라이언트 클래스
 */
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private domain: ChromeDomain | null = null;
  private eventStorage: EventStorage | undefined = undefined;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private serverUrl: string,
    private rrwebConfig: RrwebConfig,
    private skipWebSocket: boolean,
    private onDomainCreated?: (domain: ChromeDomain) => void,
    private onRrwebInit?: (socket: WebSocket | null, domain: ChromeDomain) => Promise<void>
  ) {}

  /**
   * Initialize WebSocket connection / WebSocket 연결 초기화
   */
  async initialize(): Promise<void> {
    // Initialize event storage first (for both WebSocket and postMessage modes) / 먼저 이벤트 저장소 초기화 (WebSocket 및 postMessage 모드 모두)
    await this.initializeEventStorage();

    // Skip WebSocket and use postMessage only / WebSocket 건너뛰고 postMessage만 사용
    if (this.skipWebSocket) {
      await this.initializePostMessageMode();
      return;
    }

    await this.initializeWebSocket();
  }

  /**
   * Initialize postMessage mode / postMessage 모드 초기화
   */
  private async initializePostMessageMode(): Promise<void> {
    // Initialize domain without WebSocket for postMessage mode / postMessage 모드를 위해 WebSocket 없이 도메인 초기화
    // Use eventStorage so events are saved to IndexedDB / 이벤트가 IndexedDB에 저장되도록 eventStorage 사용
    const domain = new ChromeDomain({
      socket: null,
      eventStorage: this.eventStorage,
    });
    this.domain = domain;
    this.onDomainCreated?.(domain);

    // Enable all domains immediately in postMessage mode / postMessage 모드에서는 모든 도메인을 즉시 활성화
    domain.execute({ method: 'Runtime.enable' });
    domain.execute({ method: 'Network.enable' });
    domain.execute({ method: 'Console.enable' });

    // Initialize rrweb recording even without WebSocket / WebSocket 없이도 rrweb 녹화 초기화
    if (this.onRrwebInit) {
      await this.onRrwebInit(null, domain);
    }
  }

  /**
   * Initialize WebSocket connection / WebSocket 연결 초기화
   */
  private async initializeWebSocket(): Promise<void> {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = this.serverUrl.replace(/^(http|https|ws|wss):\/\//i, '');
    const socket = new WebSocket(
      `${protocol}//${host}/remote/debug/client/${getId()}?${getQuery()}`
    );
    this.socket = socket;

    // Create domain with socket and event storage / 소켓과 이벤트 저장소로 도메인 생성
    // Event storage is already initialized in initialize() / 이벤트 저장소는 이미 initialize()에서 초기화됨
    const domain = new ChromeDomain({ socket, eventStorage: this.eventStorage });
    this.domain = domain;
    this.onDomainCreated?.(domain);

    // Setup socket event handlers / 소켓 이벤트 핸들러 설정
    this.setupSocketHandlers(socket, domain);

    // Setup periodic tasks / 주기적 작업 설정
    this.setupPeriodicTasks(socket);

    // Initialize rrweb recording / rrweb 녹화 초기화
    if (this.onRrwebInit) {
      await this.onRrwebInit(socket, domain);
    }
  }

  /**
   * Initialize event storage / 이벤트 저장소 초기화
   */
  private async initializeEventStorage(): Promise<void> {
    // Default: enabled / 기본값: 활성화
    const clientId = getId(); // Get tab-specific client ID / 탭별 고유 클라이언트 ID 가져오기
    const enableEventStorage = this.rrwebConfig.enableEventStorage !== false; // Default: true / 기본값: true
    const enableCompression = this.rrwebConfig.enableCompression !== false; // Default: true / 기본값: true

    if (!enableEventStorage) {
      return;
    }

    this.eventStorage = new EventStorage({
      clientId,
      enableCompression,
      maxStoredEvents: this.rrwebConfig.maxStoredEvents,
      maxStorageSize: this.rrwebConfig.maxStorageSize,
    });

    // Initialize storage and perform setup tasks / 저장소 초기화 및 설정 작업 수행
    await this.eventStorage.init().then(async () => {
      // Detect page reload / 페이지 새로고침 감지
      const navigationTiming = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const isReload = navigationTiming?.type === 'reload';

      if (isReload) {
        // Clear current tab's events on reload / 새로고침 시 현재 탭의 이벤트 삭제
        await this.eventStorage?.clearEvents();
      }

      // Update last active time / 마지막 활성 시간 업데이트
      await this.eventStorage?.updateLastActiveTime();

      // Cleanup orphaned events / orphaned 이벤트 정리
      await this.eventStorage?.cleanupOrphanedEvents();

      // Inject export button if enabled / 활성화된 경우 export 버튼 주입
      if (this.rrwebConfig.enableExportButton === true && this.eventStorage) {
        const { injectExportButton } = await import('../ui/export-button');
        injectExportButton(this.eventStorage);
      }
    });
  }

  /**
   * Setup socket event handlers / 소켓 이벤트 핸들러 설정
   */
  private setupSocketHandlers(socket: WebSocket, domain: ChromeDomain): void {
    socket.addEventListener('message', async ({ data }) => {
      await this.handleSocketMessage(data, domain, socket);
    });
  }

  /**
   * Send stored events / 저장된 이벤트 전송
   */
  private async sendStoredEvents(socket: WebSocket): Promise<void> {
    if (!this.eventStorage || this.rrwebConfig.enableEventStorage === false) {
      return;
    }

    try {
      const storedEvents = await this.eventStorage.getEvents();
      if (storedEvents.length > 0) {
        // Send all events in batches / 모든 이벤트를 배치로 전송
        const batchSize = 100;
        for (let i = 0; i < storedEvents.length; i += batchSize) {
          const batch = storedEvents.slice(i, i + batchSize);
          for (const event of batch) {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  method: event.method,
                  params: event.params,
                })
              );
            }
          }
          // Small delay between batches / 배치 간 작은 지연
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Clear events after sending if configured / 설정된 경우 전송 후 이벤트 삭제
        if (this.rrwebConfig.clearOnSend !== false) {
          await this.eventStorage.clearEvents();
        }
      }
    } catch (error) {
      console.error('Failed to send stored events / 저장된 이벤트 전송 실패:', error);
    }
  }

  /**
   * Handle socket message / 소켓 메시지 처리
   */
  private async handleSocketMessage(
    data: unknown,
    domain: ChromeDomain,
    socket: WebSocket
  ): Promise<void> {
    try {
      // Handle Blob or string data / Blob 또는 string 데이터 처리
      let messageText: string;
      if (data instanceof Blob) {
        messageText = await data.text();
      } else if (typeof data === 'string') {
        messageText = data;
      } else if (data instanceof ArrayBuffer) {
        messageText = new TextDecoder().decode(data);
      } else {
        // Fallback: convert to string / 폴백: string으로 변환
        messageText = String(data);
      }

      const message = JSON.parse(messageText);
      const ret = domain.execute(message);

      // Handle async methods / async 메서드 처리
      if (ret instanceof Promise) {
        const result = await ret;
        if (result.id !== undefined) {
          socket.send(JSON.stringify(result));
          // Don't send server responses via postMessage to avoid loops / 무한루프 방지를 위해 서버 응답은 postMessage로 전송하지 않음
          // Only events (from BaseDomain.send) are sent via postMessage / 이벤트만(BaseDomain.send에서) postMessage로 전송됨
        }
      } else if (ret.id !== undefined) {
        socket.send(JSON.stringify(ret));
        // Don't send server responses via postMessage to avoid loops / 무한루프 방지를 위해 서버 응답은 postMessage로 전송하지 않음
        // Only events (from BaseDomain.send) are sent via postMessage / 이벤트만(BaseDomain.send에서) postMessage로 전송됨
      }
    } catch (e) {
      console.error('CDP message error:', e);
    }
  }

  /**
   * Setup periodic tasks / 주기적 작업 설정
   */
  private setupPeriodicTasks(socket: WebSocket): void {
    if (this.rrwebConfig.enableEventStorage !== false && this.eventStorage) {
      // Update last active time every 5 minutes / 5분마다 마지막 활성 시간 업데이트
      this.updateInterval = setInterval(
        async () => {
          await this.eventStorage?.updateLastActiveTime();
        },
        5 * 60 * 1000
      );

      // Cleanup orphaned events every hour / 1시간마다 orphaned 이벤트 정리
      this.cleanupInterval = setInterval(
        async () => {
          await this.eventStorage?.cleanupOrphanedEvents();
        },
        60 * 60 * 1000
      );

      // Cleanup intervals on socket close / 소켓 종료 시 인터벌 정리
      socket.addEventListener('close', () => {
        this.cleanup();
      });
    }
  }

  /**
   * Get domain instance / 도메인 인스턴스 가져오기
   */
  getDomain(): ChromeDomain | null {
    return this.domain;
  }

  /**
   * Get socket instance / 소켓 인스턴스 가져오기
   */
  getSocket(): WebSocket | null {
    return this.socket;
  }

  /**
   * Cleanup resources / 리소스 정리
   */
  cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    // Close WebSocket connection if still open / WebSocket 연결이 열려있으면 종료
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close();
    }
    this.socket = null;
    this.domain = null;
  }
}
