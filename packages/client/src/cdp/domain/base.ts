// Base domain class for all CDP domains / 모든 CDP 도메인의 기본 클래스
export default class BaseDomain {
  protected socket: WebSocket;
  namespace: string = '';

  // Index signature for dynamic method access / 동적 메서드 접근을 위한 인덱스 시그니처
  [key: string]: WebSocket | string | unknown;

  constructor(options: { socket: WebSocket }) {
    this.socket = options.socket;
  }

  // Enable domain / 도메인 활성화
  enable(): void {
    // Override in subclasses / 서브클래스에서 오버라이드
  }

  // Send CDP message / CDP 메시지 전송
  protected send(data: unknown): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      this.socket.send(message);
    }
  }
}
