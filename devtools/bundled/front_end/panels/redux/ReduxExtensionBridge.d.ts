import type * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';
/**
 * Get global ReduxExtensionBridge instance / 전역 ReduxExtensionBridge 인스턴스 가져오기
 * Creates instance if not exists / 인스턴스가 없으면 생성
 */
export declare function getReduxExtensionBridge(): ReduxExtensionBridge;
/**
 * Initialize Redux bridge with TargetManager / TargetManager로 Redux bridge 초기화
 * Should be called once when DevTools starts / DevTools 시작 시 한 번 호출해야 함
 */
export declare function initializeReduxBridge(): void;
/**
 * Redux DevTools Extension과의 통신 브릿지 / Redux DevTools Extension과의 통신 브릿지
 * Extension의 chrome.runtime API를 시뮬레이션하고 CDP 메시지를 Extension 형식으로 변환 / Extension의 chrome.runtime API를 시뮬레이션하고 CDP 메시지를 Extension 형식으로 변환
 */
export declare class ReduxExtensionBridge {
    private iframeWindow;
    private target;
    private observer;
    private messagePort;
    private messageListeners;
    private connectCalled;
    private startSent;
    private messageBuffer;
    private panelReady;
    /**
     * Initialize bridge with iframe window / iframe window로 브릿지 초기화
     */
    initialize(iframeWindow: Window): void;
    /**
     * Flush buffered messages to extension / 버퍼된 메시지를 extension으로 전송
     * Messages are sent but buffer is preserved for re-flush on new connections / 메시지는 전송되지만 버퍼는 새 연결 시 재플러싱을 위해 보존됨
     */
    flushMessageBuffer(): void;
    /**
     * Inject chrome.runtime API into iframe / iframe에 chrome.runtime API 주입
     */
    private injectExtensionAPI;
    /**
     * Handle messages from Redux DevTools Extension / Redux DevTools Extension으로부터 메시지 처리
     */
    private handleExtensionMessage;
    /**
     * Send START message to page to request initial state / 초기 상태를 요청하기 위해 페이지에 START 메시지 전송
     * This matches the original Redux DevTools Extension behavior / 이것은 원래 Redux DevTools Extension 동작과 일치
     */
    private sendStartMessageToPage;
    /**
     * Send START message to page if not already sent / 아직 전송되지 않았다면 페이지에 START 메시지 전송
     */
    sendStartMessageToPageIfNeeded(): void;
    /**
     * Send message to page via Runtime.evaluate / Runtime.evaluate를 통해 페이지로 메시지 전송
     * This simulates the original Redux DevTools Extension message passing / 이것은 원래 Redux DevTools Extension 메시지 전달을 시뮬레이션
     */
    private sendMessageToPage;
    /**
     * Send message to Redux DevTools Extension iframe / Redux DevTools Extension iframe으로 메시지 전송
     * If panel is not ready, buffer the message / 패널이 준비되지 않았으면 메시지 버퍼링
     */
    private sendToExtension;
    /**
     * Send message directly to Redux DevTools Extension iframe / Redux DevTools Extension iframe으로 메시지 직접 전송
     */
    private sendToExtensionDirect;
    /**
     * Attach to target if not already attached / 아직 연결되지 않았으면 타겟에 연결
     * Used by global initializer / 전역 초기화에서 사용
     */
    attachToTargetIfNeeded(target: SDK.Target.Target): void;
    /**
     * Attach to target and listen for Redux CDP events / 타겟에 연결하고 Redux CDP 이벤트 리스닝
     */
    attachToTarget(target: SDK.Target.Target, connection: ProtocolClient.CDPConnection.CDPConnection): void;
    /**
     * Request Redux stores to re-initialize / Redux store들에게 재초기화 요청
     * This sends a message to the page that triggers the app to send INIT messages again
     * 페이지에 메시지를 보내서 앱이 다시 INIT 메시지를 보내도록 함
     */
    private requestReduxReInitialization;
    /**
     * Convert CDP message to Extension message format / CDP 메시지를 Extension 메시지 형식으로 변환
     * Matches Redux DevTools Extension message format exactly / Redux DevTools Extension 메시지 형식과 정확히 일치
     *
     * Extension expects:
     * - {name: "INIT_INSTANCE", instanceId: number} for INIT_INSTANCE type
     * - {name: "RELAY", message: {...}} for other message types
     * Extension은 다음을 기대함:
     * - {name: "INIT_INSTANCE", instanceId: number} (INIT_INSTANCE 타입의 경우)
     * - {name: "RELAY", message: {...}} (다른 메시지 타입의 경우)
     */
    private convertCDPToExtensionMessage;
    /**
     * Evaluate script in inspected page / inspected page에서 스크립트 실행
     */
    private evaluateInInspectedPage;
    /**
     * Get page resources / 페이지 리소스 가져오기
     */
    private getPageResources;
    /**
     * Cleanup / 정리
     */
    cleanup(): void;
}
