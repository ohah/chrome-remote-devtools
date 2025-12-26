// File to CDP message converter / 파일을 CDP 메시지로 변환하는 유틸리티

/**
 * PostMessage CDP message format / PostMessage CDP 메시지 형식
 */
export interface PostMessageCDPMessage {
  type: 'CDP_MESSAGE';
  message: string;
}

/**
 * CDP event file format / CDP 이벤트 파일 형식
 * Events are stored in postMessage format / 이벤트는 postMessage 형식으로 저장됨
 */
export interface CDPEventFile {
  version: string;
  exportDate: string;
  clientId: string;
  events: PostMessageCDPMessage[];
}

/**
 * Read file and convert to CDP messages / 파일을 읽어서 CDP 메시지로 변환
 * @param file - JSON file containing CDP messages in postMessage format / postMessage 형식의 CDP 메시지를 포함하는 JSON 파일
 * @returns Array of CDP messages in postMessage format / postMessage 형식의 CDP 메시지 배열
 */
export async function fileToCDPMessages(file: File): Promise<PostMessageCDPMessage[]> {
  const text = await file.text();
  const data: CDPEventFile = JSON.parse(text);

  if (!data.events || !Array.isArray(data.events)) {
    throw new Error('Invalid file format / 잘못된 파일 형식');
  }

  // Validate that all events are in postMessage format / 모든 이벤트가 postMessage 형식인지 검증
  const validMessages = data.events.filter((event) => {
    return event.type === 'CDP_MESSAGE' && typeof event.message === 'string';
  });

  if (validMessages.length !== data.events.length) {
    console.warn(
      'Some events are not in postMessage format, filtering them out / 일부 이벤트가 postMessage 형식이 아니어서 필터링됨'
    );
  }

  return validMessages;
}

/**
 * Read file and get full file data including clientId / 파일을 읽어서 clientId를 포함한 전체 파일 데이터 가져오기
 * @param file - JSON file containing CDP messages / CDP 메시지를 포함하는 JSON 파일
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
