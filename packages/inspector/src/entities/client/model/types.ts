/**
 * Client entity types / 클라이언트 엔티티 타입
 */
export type ClientType = 'web' | 'react-native';

/**
 * Web client / 웹 클라이언트
 */
export interface WebClient {
  /** Client unique identifier / 클라이언트 고유 식별자 */
  id: string;
  /** Client type / 클라이언트 타입 */
  type: 'web';
  /** Page URL / 페이지 URL */
  url?: string;
  /** User Agent string / 사용자 에이전트 문자열 */
  ua?: string;
  /** IP address / IP 주소 */
  ip?: string;
}

/**
 * React Native Inspector client / React Native Inspector 클라이언트
 */
export interface ReactNativeClient {
  /** Client unique identifier / 클라이언트 고유 식별자 */
  id: string;
  /** Client type / 클라이언트 타입 */
  type: 'react-native';
  /** Device name / 디바이스 이름 */
  deviceName?: string;
  /** App name / 앱 이름 */
  appName?: string;
  /** Device ID / 디바이스 ID */
  deviceId?: string;
}

/**
 * Client union type / 클라이언트 유니온 타입
 */
export type Client = WebClient | ReactNativeClient;
