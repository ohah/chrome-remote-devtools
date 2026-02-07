// CDP message handler for Redux DevTools App / Redux DevTools App용 CDP 메시지 핸들러
// Converts CDP Redux.message events to @redux-devtools/app format / CDP Redux.message 이벤트를 @redux-devtools/app 형식으로 변환

import type { Store } from 'redux';
import type { StoreState, StoreAction } from '@redux-devtools/app';

// UPDATE_STATE action type constant / UPDATE_STATE 액션 타입 상수
// From @redux-devtools/app-core: 'devTools/UPDATE_STATE' / @redux-devtools/app-core에서: 'devTools/UPDATE_STATE'
const UPDATE_STATE = 'devTools/UPDATE_STATE';

/**
 * CDP message parameters / CDP 메시지 파라미터
 */
interface CDPMessageParams {
  type: string;
  instanceId?: number;
  source?: string;
  payload?: string;
  action?: string;
  name?: string;
  maxAge?: number;
  nextActionId?: number;
  timestamp?: number;
}

/**
 * CDP message handler / CDP 메시지 핸들러
 * Handles CDP messages and converts them to @redux-devtools/app actions / CDP 메시지를 처리하고 @redux-devtools/app 액션으로 변환
 */
export class CDPMessageHandler {
  private store: Store<StoreState, StoreAction> | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  /**
   * Initialize handler with store / store로 핸들러 초기화
   */
  initialize(store: Store<StoreState, StoreAction>): void {
    this.store = store;
    this.setupMessageListener();
  }

  /**
   * Setup message listener for CDP messages / CDP 메시지를 위한 메시지 리스너 설정
   * Listens for messages from ReduxExtensionBridge (parent window) / ReduxExtensionBridge(부모 윈도우)에서 메시지 수신
   */
  private setupMessageListener(): void {
    this.messageListener = (event: MessageEvent) => {
      // ReduxExtensionBridge sends messages in two formats / ReduxExtensionBridge는 두 가지 형식으로 메시지를 보냄
      // 1. {name: "INIT_INSTANCE", instanceId: number}
      // 2. {name: "RELAY", message: {...}}

      if (event.data && typeof event.data === 'object') {
        // Check for INIT_INSTANCE format / INIT_INSTANCE 형식 확인
        if (event.data.name === 'INIT_INSTANCE' && event.data.instanceId !== undefined) {
          this.handleCDPMessage({
            type: 'INIT_INSTANCE',
            instanceId: event.data.instanceId,
          });
        }
        // Check for RELAY format / RELAY 형식 확인
        else if (event.data.name === 'RELAY' && event.data.message) {
          this.handleCDPMessage(event.data.message as CDPMessageParams);
        }
        // Also check for direct CDP_EVENT format (fallback) / 직접 CDP_EVENT 형식도 확인 (폴백)
        else if (
          event.data.type === 'CDP_EVENT' &&
          event.data.domain === 'Redux' &&
          event.data.params
        ) {
          this.handleCDPMessage(event.data.params as CDPMessageParams);
        }
      }
    };

    window.addEventListener('message', this.messageListener);
  }

  /**
   * Handle CDP message and convert to @redux-devtools/app format / CDP 메시지 처리 및 @redux-devtools/app 형식으로 변환
   * The app expects UPDATE_STATE action with Request format / 앱은 Request 형식의 UPDATE_STATE 액션을 기대함
   * Request types: INIT, ACTION, STATE, PARTIAL_STATE, LIFTED, EXPORT / Request 타입: INIT, ACTION, STATE, PARTIAL_STATE, LIFTED, EXPORT
   */
  private handleCDPMessage(params: CDPMessageParams): void {
    if (!this.store) {
      return;
    }

    try {
      // Convert CDP message to UPDATE_STATE action with Request format / CDP 메시지를 Request 형식의 UPDATE_STATE 액션으로 변환
      // The app's api middleware processes UPDATE_STATE actions / 앱의 api middleware가 UPDATE_STATE 액션을 처리함

      let request: {
        type: string;
        instanceId?: number;
        id?: string;
        action?: string;
        payload?: string;
        name?: string;
        maxAge?: number;
        nextActionId?: number;
        timestamp?: number;
        [key: string]: unknown;
      };

      // Convert based on message type / 메시지 타입에 따라 변환
      if (params.type === 'INIT' || params.type === 'INIT_INSTANCE') {
        // INIT request format / INIT 요청 형식
        request = {
          type: 'INIT',
          instanceId: params.instanceId,
          id: params.instanceId?.toString(),
          action: params.action,
          payload: params.payload,
          name: params.name,
        };
      } else if (params.type === 'ACTION') {
        // ACTION request format / ACTION 요청 형식
        request = {
          type: 'ACTION',
          instanceId: params.instanceId,
          id: params.instanceId?.toString(),
          action: params.action,
          payload: params.payload,
          nextActionId: params.nextActionId || 1,
          maxAge: params.maxAge || 50,
        };
      } else if (params.type === 'STATE') {
        // STATE request format / STATE 요청 형식
        request = {
          type: 'STATE',
          instanceId: params.instanceId,
          id: params.instanceId?.toString(),
          payload: params.payload,
        };
      } else {
        // Default: use the message as-is / 기본값: 메시지를 그대로 사용
        request = {
          type: params.type,
          instanceId: params.instanceId,
          id: params.instanceId?.toString(),
          action: params.action,
          payload: params.payload,
          name: params.name,
          maxAge: params.maxAge,
          nextActionId: params.nextActionId,
          timestamp: params.timestamp,
        };
      }

      // Dispatch UPDATE_STATE action / UPDATE_STATE 액션 dispatch
      // This is the action type that @redux-devtools/app's api middleware processes / 이것은 @redux-devtools/app의 api middleware가 처리하는 액션 타입
      this.dispatchToApp({
        type: UPDATE_STATE,
        request,
        id: params.instanceId?.toString(),
      } as StoreAction);
    } catch {
      // Ignore parse/dispatch errors / 파싱·dispatch 오류 무시
    }
  }

  /**
   * Dispatch action to @redux-devtools/app store / @redux-devtools/app store에 액션 dispatch
   * The app expects messages in a format similar to @redux-devtools/remote / 앱은 @redux-devtools/remote와 유사한 형식의 메시지를 기대함
   */
  private dispatchToApp(action: StoreAction): void {
    if (!this.store) {
      return;
    }

    try {
      this.store.dispatch(action);
    } catch {
      // Ignore dispatch errors / dispatch 오류 무시
    }
  }

  /**
   * Cleanup / 정리
   */
  cleanup(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    this.store = null;
  }
}

/**
 * Create CDP message handler / CDP 메시지 핸들러 생성
 */
export function createCDPMessageHandler(store: Store<StoreState, StoreAction>): CDPMessageHandler {
  const handler = new CDPMessageHandler();
  handler.initialize(store);
  return handler;
}
