// File to CDP message converter / 파일을 CDP 메시지로 변환하는 유틸리티

/**
 * CDP event file format / CDP 이벤트 파일 형식
 */
export interface CDPEventFile {
  version: string;
  exportDate: string;
  clientId: string;
  events: Array<{
    method: string;
    params: unknown;
    timestamp: number;
  }>;
}

/**
 * CDP message format for postMessage / postMessage를 위한 CDP 메시지 형식
 */
export interface CDPMessage {
  type: 'CDP_MESSAGE';
  message: string;
}

/**
 * Read file and convert to CDP events / 파일을 읽어서 CDP 이벤트로 변환
 * @param file - JSON file containing CDP events / CDP 이벤트를 포함하는 JSON 파일
 * @returns Array of CDP events / CDP 이벤트 배열
 */
export async function fileToCDPEvents(file: File): Promise<CDPEventFile['events']> {
  const text = await file.text();
  const data: CDPEventFile = JSON.parse(text);

  if (!data.events || !Array.isArray(data.events)) {
    throw new Error('Invalid file format / 잘못된 파일 형식');
  }

  return data.events;
}

/**
 * Convert CDP events to postMessage format / CDP 이벤트를 postMessage 형식으로 변환
 * @param events - Array of CDP events / CDP 이벤트 배열
 * @returns Array of CDP messages for postMessage / postMessage를 위한 CDP 메시지 배열
 */
export function eventsToCDPMessages(events: CDPEventFile['events']): CDPMessage[] {
  return events.map((event) => ({
    type: 'CDP_MESSAGE' as const,
    message: JSON.stringify({
      method: event.method,
      params: event.params,
    }),
  }));
}

/**
 * Read file and convert to CDP messages / 파일을 읽어서 CDP 메시지로 변환
 * @param file - JSON file containing CDP events / CDP 이벤트를 포함하는 JSON 파일
 * @returns Array of CDP messages / CDP 메시지 배열
 */
export async function fileToCDPMessages(file: File): Promise<CDPMessage[]> {
  const events = await fileToCDPEvents(file);
  return eventsToCDPMessages(events);
}

/**
 * Read file and get full file data including clientId / 파일을 읽어서 clientId를 포함한 전체 파일 데이터 가져오기
 * @param file - JSON file containing CDP events / CDP 이벤트를 포함하는 JSON 파일
 * @returns Full CDP event file data / 전체 CDP 이벤트 파일 데이터
 */
export async function readCDPFile(file: File): Promise<CDPEventFile> {
  const text = await file.text();
  const data: CDPEventFile = JSON.parse(text);

  if (!data.events || !Array.isArray(data.events)) {
    throw new Error('Invalid file format / 잘못된 파일 형식');
  }

  return data;
}
