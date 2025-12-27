// CDP message parsing utilities / CDP 메시지 파싱 유틸리티
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';

/**
 * CDP message type / CDP 메시지 타입
 */
export interface CDPMessage {
  method?: string;
  params?: unknown;
  id?: number;
  result?: unknown;
  error?: unknown;
}

/**
 * Safely parse CDP message / CDP 메시지를 안전하게 파싱
 * @param message - Message string to parse / 파싱할 메시지 문자열
 * @returns Parsed message or null if parsing fails / 파싱된 메시지 또는 파싱 실패 시 null
 */
export function safeParseCDPMessage(message: string): CDPMessage | null {
  try {
    return JSON.parse(message) as CDPMessage;
  } catch {
    return null;
  }
}

/**
 * Check if object is a CDP message / 객체가 CDP 메시지인지 확인
 * @param obj - Object to check / 확인할 객체
 * @returns True if object is a CDP message / 객체가 CDP 메시지이면 true
 */
export function isCDPMessage(obj: unknown): obj is CDPMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('method' in obj || 'id' in obj || 'result' in obj || 'error' in obj)
  );
}

/**
 * Check if message is a command (has id) / 메시지가 명령인지 확인 (id가 있는지)
 * @param parsed - Parsed CDP message / 파싱된 CDP 메시지
 * @returns True if message is a command / 메시지가 명령이면 true
 */
export function isCDPCommand(parsed: CDPMessage): boolean {
  return parsed.id !== undefined;
}

/**
 * Check if message is an event (no id) / 메시지가 이벤트인지 확인 (id가 없는지)
 * @param parsed - Parsed CDP message / 파싱된 CDP 메시지
 * @returns True if message is an event / 메시지가 이벤트이면 true
 */
export function isCDPEvent(parsed: CDPMessage): boolean {
  return parsed.id === undefined;
}

/**
 * Filter messages by method prefix / 메소드 접두사로 메시지 필터링
 * @param messages - Messages to filter / 필터링할 메시지
 * @param prefix - Method prefix / 메소드 접두사
 * @returns Filtered messages / 필터링된 메시지
 */
export function filterMessagesByMethod(
  messages: PostMessageCDPMessage[],
  prefix: string
): PostMessageCDPMessage[] {
  return messages.filter((msg) => {
    const parsed = safeParseCDPMessage(msg.message);
    return parsed?.method?.startsWith(prefix);
  });
}

/**
 * Categorize messages into commands and events / 메시지를 명령과 이벤트로 분류
 * @param messages - Messages to categorize / 분류할 메시지
 * @returns Categorized messages / 분류된 메시지
 */
export function categorizeMessages(messages: PostMessageCDPMessage[]): {
  commands: PostMessageCDPMessage[];
  events: PostMessageCDPMessage[];
} {
  const commands: PostMessageCDPMessage[] = [];
  const events: PostMessageCDPMessage[] = [];

  for (const msg of messages) {
    const parsed = safeParseCDPMessage(msg.message);
    if (parsed && isCDPCommand(parsed)) {
      commands.push(msg);
    } else {
      events.push(msg);
    }
  }

  return { commands, events };
}

/**
 * Categorize events by type / 이벤트를 타입별로 분류
 * @param events - Events to categorize / 분류할 이벤트
 * @returns Categorized events / 분류된 이벤트
 */
export function categorizeEvents(events: PostMessageCDPMessage[]): {
  domStorageEvents: PostMessageCDPMessage[];
  sessionReplayEvents: PostMessageCDPMessage[];
  networkEvents: PostMessageCDPMessage[];
  nonNetworkEvents: PostMessageCDPMessage[];
} {
  const domStorageEvents = filterMessagesByMethod(events, 'DOMStorage.');
  const sessionReplayEvents = filterMessagesByMethod(events, 'SessionReplay.');
  const networkEvents = filterMessagesByMethod(events, 'Network.');

  const nonNetworkEvents = events.filter((msg) => {
    const parsed = safeParseCDPMessage(msg.message);
    if (!parsed) {
      return true; // If parsing fails, include it in other events / 파싱 실패 시 다른 이벤트에 포함
    }
    return (
      !parsed.method?.startsWith('DOMStorage.') &&
      !parsed.method?.startsWith('SessionReplay.') &&
      !parsed.method?.startsWith('Network.')
    );
  });

  return {
    domStorageEvents,
    sessionReplayEvents,
    networkEvents,
    nonNetworkEvents,
  };
}

