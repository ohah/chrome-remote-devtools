import type * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';
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
    /**
     * Initialize bridge with iframe window / iframe window로 브릿지 초기화
     */
    initialize(iframeWindow: Window): void;
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
     */
    private sendToExtension;
    /**
     * Attach to target and listen for Redux CDP events / 타겟에 연결하고 Redux CDP 이벤트 리스닝
     */
    attachToTarget(target: SDK.Target.Target, connection: ProtocolClient.CDPConnection.CDPConnection): void;
    /**
     * Convert CDP message to Extension message format / CDP 메시지를 Extension 메시지 형식으로 변환
     * Matches Redux DevTools Extension message format exactly / Redux DevTools Extension 메시지 형식과 정확히 일치
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
