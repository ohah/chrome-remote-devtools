/**
 * Client entity types / 클라이언트 엔티티 타입
 */
export interface Client {
  /** Client unique identifier / 클라이언트 고유 식별자 */
  id: string;
  /** Page URL / 페이지 URL */
  url?: string;
  /** Page title / 페이지 제목 */
  title?: string;
  /** User Agent string / 사용자 에이전트 문자열 */
  ua?: string;
  /** IP address / IP 주소 */
  ip?: string;
}
