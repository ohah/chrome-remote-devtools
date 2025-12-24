import type * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
/**
 * PostMessageTransport implements ConnectionTransport using postMessage API / PostMessageTransport는 postMessage API를 사용하여 ConnectionTransport를 구현합니다.
 *
 * This transport is used when DevTools is loaded in an iframe or popup window / 이 transport는 DevTools가 iframe 또는 팝업 창에 로드될 때 사용됩니다.
 * and needs to communicate with the parent/opener window via postMessage / 부모/열린 창과 postMessage를 통해 통신해야 할 때.
 */
export declare class PostMessageTransport implements ProtocolClient.ConnectionTransport.ConnectionTransport {
    #private;
    onMessage: ((arg0: Object | string) => void) | null;
    constructor(onConnectionLost: (message: Platform.UIString.LocalizedString) => void);
    setOnMessage(onMessage: (arg0: Object | string) => void): void;
    setOnDisconnect(onDisconnect: (arg0: string) => void): void;
    /**
     * Send CDP message to parent/opener window / 부모/열린 창에 CDP 메시지 전송
     */
    sendRawMessage(message: string): void;
    disconnect(): Promise<void>;
}
