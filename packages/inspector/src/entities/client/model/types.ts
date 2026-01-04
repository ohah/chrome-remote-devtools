/**
 * Client entity types / 클라이언트 엔티티 타입
 */
export type ClientType = 'web' | 'react-native';

export interface Client {
  /** Client unique identifier / 클라이언트 고유 식별자 */
  id: string;
  /** Client type / 클라이언트 타입 */
  type?: ClientType;

  // Web client fields / 웹 클라이언트 필드
  /** Page URL / 페이지 URL */
  url?: string;
  /** Page title / 페이지 제목 */
  title?: string;
  /** User Agent string / 사용자 에이전트 문자열 */
  ua?: string;
  /** IP address / IP 주소 */
  ip?: string;

  // React Native Inspector fields / React Native Inspector 필드
  /** Device name / 디바이스 이름 */
  deviceName?: string;
  /** App name / 앱 이름 */
  appName?: string;
  /** Device ID / 디바이스 ID */
  deviceId?: string;
  /** Whether profiling is enabled / 프로파일링 활성화 여부 */
  profiling?: boolean;
}
