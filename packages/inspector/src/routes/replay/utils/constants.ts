// Constants for replay mode / replay 모드를 위한 상수

/**
 * Delay constants in milliseconds / 밀리초 단위의 지연 상수
 */
export const DELAYS = {
  /** Delay for command processing / 명령 처리 지연 */
  COMMAND_PROCESSING: 10,
  /** Delay for storage initialization / storage 초기화 지연 */
  STORAGE_INIT: 200,
  /** Delay for DOM storage processing / DOM storage 처리 지연 */
  DOM_STORAGE_PROCESSING: 500,
  /** Delay for DevTools initialization / DevTools 초기화 지연 */
  DEVTOOLS_INIT: 1000,
  /** Delay for network event processing / 네트워크 이벤트 처리 지연 */
  NETWORK_PROCESSING: 200,
  /** Delay for DevTools full initialization backup / DevTools 완전 초기화 백업 지연 */
  DEVTOOLS_FULL_INIT_BACKUP: 5000,
  /** Delay for timeout / 타임아웃 지연 */
  TIMEOUT: 10000,
} as const;

