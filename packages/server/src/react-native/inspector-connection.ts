import { WebSocket } from 'ws';
import { log, logError } from '../socket-server';

/**
 * React Native Inspector connection information / React Native Inspector 연결 정보
 */
export interface ReactNativeInspectorConnection {
  /** Connection ID / 연결 ID */
  id: string;
  /** WebSocket connection / WebSocket 연결 */
  ws: WebSocket;
  /** Device name / 디바이스 이름 */
  deviceName?: string;
  /** App name / 앱 이름 */
  appName?: string;
  /** Device ID / 디바이스 ID */
  deviceId?: string;
  /** Whether profiling is enabled / 프로파일링 활성화 여부 */
  profiling?: boolean;
  /** Associated client ID (if connected to a client) / 연결된 클라이언트 ID (클라이언트에 연결된 경우) */
  clientId?: string;
}

/**
 * React Native Inspector connection manager / React Native Inspector 연결 관리자
 */
export class ReactNativeInspectorConnectionManager {
  private connections: Map<string, ReactNativeInspectorConnection> = new Map();

  /**
   * Create a new React Native Inspector connection / 새로운 React Native Inspector 연결 생성
   * @param ws - WebSocket connection / WebSocket 연결
   * @param connectionInfo - Connection information / 연결 정보
   * @returns Connection ID / 연결 ID
   */
  createConnection(
    ws: WebSocket,
    connectionInfo: Omit<ReactNativeInspectorConnection, 'ws' | 'id'>
  ): string {
    const id = `rn-inspector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const connection: ReactNativeInspectorConnection = {
      id,
      ws,
      ...connectionInfo,
    };

    this.connections.set(id, connection);
    log('rn-inspector', id, 'connected', {
      deviceName: connectionInfo.deviceName,
      appName: connectionInfo.appName,
      deviceId: connectionInfo.deviceId,
    });

    // Handle connection close / 연결 종료 처리
    ws.on('close', () => {
      log('rn-inspector', id, 'disconnected');
      this.connections.delete(id);
    });

    ws.on('error', (error) => {
      logError('rn-inspector', id, 'error', error);
    });

    return id;
  }

  /**
   * Get connection by ID / ID로 연결 가져오기
   * @param id - Connection ID / 연결 ID
   * @returns Connection or undefined / 연결 또는 undefined
   */
  getConnection(id: string): ReactNativeInspectorConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Get all connections / 모든 연결 가져오기
   * @returns Array of connections / 연결 배열
   */
  getAllConnections(): Array<Omit<ReactNativeInspectorConnection, 'ws'>> {
    return Array.from(this.connections.values()).map(({ ws, ...rest }) => rest);
  }

  /**
   * Remove connection / 연결 제거
   * @param id - Connection ID / 연결 ID
   */
  removeConnection(id: string): void {
    const connection = this.connections.get(id);
    if (connection) {
      connection.ws.close();
      this.connections.delete(id);
    }
  }

  /**
   * Associate connection with a client / 연결을 클라이언트와 연결
   * @param inspectorId - Inspector connection ID / Inspector 연결 ID
   * @param clientId - Client ID / 클라이언트 ID
   * @returns true if successful / 성공하면 true
   */
  associateWithClient(inspectorId: string, clientId: string): boolean {
    const connection = this.connections.get(inspectorId);
    if (!connection) {
      return false;
    }

    connection.clientId = clientId;
    log('rn-inspector', inspectorId, `associated with client ${clientId}`);
    return true;
  }

  /**
   * Disassociate connection from client / 연결을 클라이언트에서 분리
   * @param inspectorId - Inspector connection ID / Inspector 연결 ID
   */
  disassociateFromClient(inspectorId: string): void {
    const connection = this.connections.get(inspectorId);
    if (connection) {
      connection.clientId = undefined;
      log('rn-inspector', inspectorId, 'disassociated from client');
    }
  }
}
