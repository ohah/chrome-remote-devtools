import { WebSocket } from 'ws';
import { log, logError } from '../socket-server';

/**
 * Redux store instance information / Redux store 인스턴스 정보
 */
export interface ReduxStoreInstance {
  /** Instance ID / 인스턴스 ID */
  instanceId: number;
  /** Store name / Store 이름 */
  name: string;
  /** Current state (JSON string) / 현재 상태 (JSON 문자열) */
  payload: string;
  /** Timestamp / 타임스탬프 */
  timestamp: number;
}

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
  /** Associated client ID (if connected to a client) / 연결된 클라이언트 ID (클라이언트에 연결된 경우) */
  clientId?: string;
  /** Redux store instances / Redux store 인스턴스 */
  reduxStores?: Map<number, ReduxStoreInstance>;
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

  /**
   * Store Redux store instance information / Redux store 인스턴스 정보 저장
   * Called when INIT message is received from React Native app / React Native 앱에서 INIT 메시지를 받으면 호출됨
   * @param inspectorId - Inspector connection ID / Inspector 연결 ID
   * @param storeInfo - Store information / Store 정보
   */
  storeReduxInstance(inspectorId: string, storeInfo: ReduxStoreInstance): void {
    const connection = this.connections.get(inspectorId);
    if (!connection) {
      return;
    }

    if (!connection.reduxStores) {
      connection.reduxStores = new Map();
    }

    connection.reduxStores.set(storeInfo.instanceId, storeInfo);
    log(
      'rn-inspector',
      inspectorId,
      `stored Redux instance ${storeInfo.instanceId} (${storeInfo.name})`
    );
  }

  /**
   * Update Redux store state / Redux store 상태 업데이트
   * Called when ACTION message is received / ACTION 메시지를 받으면 호출됨
   * @param inspectorId - Inspector connection ID / Inspector 연결 ID
   * @param instanceId - Redux instance ID / Redux 인스턴스 ID
   * @param payload - New state (JSON string) / 새 상태 (JSON 문자열)
   * @param timestamp - Timestamp / 타임스탬프
   */
  updateReduxState(
    inspectorId: string,
    instanceId: number,
    payload: string,
    timestamp: number
  ): void {
    const connection = this.connections.get(inspectorId);
    if (!connection || !connection.reduxStores) {
      return;
    }

    const store = connection.reduxStores.get(instanceId);
    if (store) {
      store.payload = payload;
      store.timestamp = timestamp;
    }
  }

  /**
   * Get all Redux store instances for a connection / 연결의 모든 Redux store 인스턴스 가져오기
   * @param inspectorId - Inspector connection ID / Inspector 연결 ID
   * @returns Array of Redux store instances / Redux store 인스턴스 배열
   */
  getReduxStores(inspectorId: string): ReduxStoreInstance[] {
    const connection = this.connections.get(inspectorId);
    if (!connection || !connection.reduxStores) {
      return [];
    }
    return Array.from(connection.reduxStores.values());
  }
}
