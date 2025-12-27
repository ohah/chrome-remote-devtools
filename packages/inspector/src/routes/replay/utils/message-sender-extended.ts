// Extended message sender utilities for replay mode / replay 모드를 위한 확장 메시지 전송 유틸리티
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';
import type { ResponseBodyStore } from '../types';
import { sendBufferedMessages, sendFakeResponse, sendStorageItemsAsEvents } from './message-sender';
import { extractDOMStorageItems } from './extractors';
import { DELAYS } from './constants';
import {
  safeParseCDPMessage,
  categorizeMessages,
  categorizeEvents,
  filterMessagesByMethod,
} from './cdp-message-utils';

/**
 * Context for sending CDP messages / CDP 메시지 전송을 위한 컨텍스트
 */
export interface SendCDPMessagesContext {
  cdpMessages: PostMessageCDPMessage[];
  eventBuffer: PostMessageCDPMessage[];
  file: File;
  targetWindow: Window;
  responseBodyStore: ResponseBodyStore;
  setIsLoading: (loading: boolean) => void;
}

/**
 * Default initialization commands / 기본 초기화 명령
 */
export const DEFAULT_INIT_COMMANDS = [
  { id: 1, method: 'Runtime.enable', params: {} },
  { id: 2, method: 'DOM.enable', params: {} },
  { id: 3, method: 'Network.enable', params: {} },
  { id: 4, method: 'DOMStorage.enable', params: {} },
  { id: 5, method: 'SessionReplay.enable', params: {} },
] as const;

/**
 * Send default initialization commands / 기본 초기화 명령 전송
 * @param context - Send context / 전송 컨텍스트
 */
export async function sendDefaultInitCommands(context: SendCDPMessagesContext): Promise<void> {
  for (const cmd of DEFAULT_INIT_COMMANDS) {
    const commandMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify(cmd),
    };
    context.targetWindow.postMessage(commandMessage, '*');
    sendFakeResponse(context.targetWindow, cmd.id);

    // Note: Don't send storage items here because handleMessage will handle DOMStorage.enable command / 참고: handleMessage에서 DOMStorage.enable 명령을 처리하므로 여기서는 storage 항목을 전송하지 않음
  }
  // Wait for DevTools to process initialization commands / DevTools가 초기화 명령을 처리할 시간 대기
  await new Promise((resolve) => setTimeout(resolve, DELAYS.DEVTOOLS_INIT));
}

/**
 * Send commands from file / 파일에서 읽은 명령 전송
 * @param commands - Commands to send / 전송할 명령
 * @param context - Send context / 전송 컨텍스트
 */
export async function sendCommandsFromFile(
  commands: PostMessageCDPMessage[],
  context: SendCDPMessagesContext
): Promise<void> {
  for (const commandMsg of commands) {
    const parsed = safeParseCDPMessage(commandMsg.message);
    if (!parsed) {
      continue; // Skip invalid messages / 유효하지 않은 메시지 건너뛰기
    }

    context.targetWindow.postMessage(commandMsg, '*');
    // Send fake response for command / 명령에 대한 가짜 응답 전송
    if (parsed.id !== undefined) {
      sendFakeResponse(context.targetWindow, parsed.id);

      // Send initial storage items after DOMStorage.enable from file / 파일에서 읽은 DOMStorage.enable 후 초기 storage 항목 전송
      if (parsed.method === 'DOMStorage.enable') {
        // Wait a bit for DevTools to process the enable command / DevTools가 enable 명령을 처리할 시간 대기
        setTimeout(() => {
          void extractDOMStorageItems(context.file, context.cdpMessages).then((storageItems) => {
            sendStorageItemsAsEvents(storageItems, context.targetWindow);
          });
        }, DELAYS.STORAGE_INIT);
      }
    }
  }
  // Wait for DevTools to process commands / DevTools가 명령을 처리할 시간 대기
  await new Promise((resolve) => setTimeout(resolve, DELAYS.DEVTOOLS_INIT));
}

/**
 * Send SessionReplay events only / SessionReplay 이벤트만 전송
 * @param context - Send context / 전송 컨텍스트
 */
export async function sendSessionReplayEvents(context: SendCDPMessagesContext): Promise<void> {
  // Collect all messages / 모든 메시지 수집
  const messagesToSend = [...context.cdpMessages, ...context.eventBuffer];

  if (messagesToSend.length === 0) {
    return;
  }

  // Filter only SessionReplay events / SessionReplay 이벤트만 필터링
  const sessionReplayEvents = filterMessagesByMethod(messagesToSend, 'SessionReplay.');

  if (sessionReplayEvents.length > 0) {
    await sendBufferedMessages(
      sessionReplayEvents,
      context.targetWindow,
      context.responseBodyStore
    );
  }
}

/**
 * Send CDP messages when DevTools is ready / DevTools가 준비될 때 CDP 메시지 전송
 * @param context - Send context / 전송 컨텍스트
 * @param includeSessionReplay - Whether to include SessionReplay events / SessionReplay 이벤트 포함 여부
 */
/**
 * Sort network events by type within each requestId group / 각 requestId 그룹 내에서 이벤트 타입별로 정렬
 * @param networkEvents - Network events grouped by requestId / requestId별로 그룹화된 네트워크 이벤트
 * @returns Sorted network events / 정렬된 네트워크 이벤트
 */
function sortNetworkEventsByType(
  networkEvents: Map<string, PostMessageCDPMessage[]>
): PostMessageCDPMessage[] {
  const sortedNetworkEvents: PostMessageCDPMessage[] = [];
  const networkEventTypes = [
    'Network.requestWillBeSent',
    'Network.responseReceived',
    'Network.loadingFinished',
  ] as const;

  for (const [, events] of networkEvents) {
    // Find events by type in order / 순서대로 타입별로 이벤트 찾기
    for (const eventType of networkEventTypes) {
      const event = events.find((e) => {
        const parsed = safeParseCDPMessage(e.message);
        return parsed?.method === eventType;
      });
      if (event) {
        sortedNetworkEvents.push(event);
      }
    }
  }

  return sortedNetworkEvents;
}

/**
 * Group network events by requestId / 네트워크 이벤트를 requestId별로 그룹화
 * @param networkEvents - Network events to group / 그룹화할 네트워크 이벤트
 * @returns Grouped events and events without requestId / 그룹화된 이벤트와 requestId가 없는 이벤트
 */
function groupNetworkEventsByRequestId(networkEvents: PostMessageCDPMessage[]): {
  eventsByRequestId: Map<string, PostMessageCDPMessage[]>;
  eventsWithoutRequestId: PostMessageCDPMessage[];
} {
  const eventsByRequestId = new Map<string, PostMessageCDPMessage[]>();
  const eventsWithoutRequestId: PostMessageCDPMessage[] = [];

  for (const msg of networkEvents) {
    const parsed = safeParseCDPMessage(msg.message);
    if (!parsed) {
      eventsWithoutRequestId.push(msg);
      continue;
    }

    const requestId =
      parsed.params && typeof parsed.params === 'object' && 'requestId' in parsed.params
        ? (parsed.params.requestId as string)
        : undefined;

    if (requestId) {
      if (!eventsByRequestId.has(requestId)) {
        eventsByRequestId.set(requestId, []);
      }
      eventsByRequestId.get(requestId)!.push(msg);
    } else {
      eventsWithoutRequestId.push(msg);
    }
  }

  return { eventsByRequestId, eventsWithoutRequestId };
}

export async function sendCDPMessages(
  context: SendCDPMessagesContext,
  includeSessionReplay = false
): Promise<void> {
  // Collect all messages to send: initial messages + buffered messages / 전송할 모든 메시지 수집: 초기 메시지 + 버퍼에 있는 메시지
  const messagesToSend = [...context.cdpMessages, ...context.eventBuffer];

  if (messagesToSend.length === 0) {
    context.setIsLoading(false);
    return;
  }

  // Separate commands and events / 명령과 이벤트 분리
  const { commands, events } = categorizeMessages(messagesToSend);

  // Send commands first (initialization commands from file) / 먼저 명령 전송 (파일에서 읽은 초기화 명령)
  // If no commands in file, send default initialization commands / 파일에 명령이 없으면 기본 초기화 명령 전송
  if (commands.length === 0) {
    await sendDefaultInitCommands(context);
  } else {
    await sendCommandsFromFile(commands, context);
  }

  // Separate events by type / 이벤트 타입별로 분리
  const { domStorageEvents, sessionReplayEvents, networkEvents, nonNetworkEvents } =
    categorizeEvents(events);

  // Send DOMStorage events first (initial state) / DOMStorage 이벤트를 먼저 전송 (초기 상태)
  if (domStorageEvents.length > 0) {
    await sendBufferedMessages(domStorageEvents, context.targetWindow, context.responseBodyStore);
    // Delay to ensure DOMStorage events are processed / DOMStorage 이벤트가 처리될 시간 제공
    await new Promise((resolve) => setTimeout(resolve, DELAYS.DOM_STORAGE_PROCESSING));
  }

  // Sort network events by requestId to ensure proper order / 네트워크 이벤트를 requestId별로 정렬하여 순서 보장
  const { eventsByRequestId, eventsWithoutRequestId } = groupNetworkEventsByRequestId(networkEvents);

  // Sort network events by type within each requestId group / 각 requestId 그룹 내에서 이벤트 타입별로 정렬
  const sortedNetworkEvents = sortNetworkEventsByType(eventsByRequestId);

  // Add network events without requestId at the end / requestId가 없는 네트워크 이벤트를 마지막에 추가
  sortedNetworkEvents.push(...eventsWithoutRequestId);

  // Send network events in sorted order / 정렬된 순서로 네트워크 이벤트 전송
  if (sortedNetworkEvents.length > 0) {
    await sendBufferedMessages(
      sortedNetworkEvents,
      context.targetWindow,
      context.responseBodyStore
    );
    // Delay to ensure network events are processed / 네트워크 이벤트가 처리될 시간 제공
    await new Promise((resolve) => setTimeout(resolve, DELAYS.NETWORK_PROCESSING));
  }

  // Then send other non-network events / 그 다음 다른 비네트워크 이벤트 전송
  if (nonNetworkEvents.length > 0) {
    await sendBufferedMessages(nonNetworkEvents, context.targetWindow, context.responseBodyStore);
  }

  // Send SessionReplay events if this is the first activation / 첫 활성화인 경우 SessionReplay 이벤트도 전송
  if (includeSessionReplay && sessionReplayEvents.length > 0) {
    await sendBufferedMessages(
      sessionReplayEvents,
      context.targetWindow,
      context.responseBodyStore
    );
  }

  context.setIsLoading(false);
}
