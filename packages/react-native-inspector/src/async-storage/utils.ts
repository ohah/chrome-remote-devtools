// AsyncStorage utilities / AsyncStorage 유틸리티

/**
 * AsyncStorage interface / AsyncStorage 인터페이스
 * Matches @react-native-async-storage/async-storage API / @react-native-async-storage/async-storage API와 일치
 * Reference: https://react-native-async-storage.github.io/2.0/API/
 */
export interface AsyncStorageType {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  mergeItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
  multiSet(entries: Array<[string, string]>): Promise<void>;
  multiMerge(entries: Array<[string, string]>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Check if object is AsyncStorage instance / 객체가 AsyncStorage 인스턴스인지 확인
 * AsyncStorage는 객체이지만 메서드들을 가지고 있으므로, constructor나 prototype 체크로 구분 / AsyncStorage is an object but has methods, so we distinguish by checking constructor or prototype
 */
const isAsyncStorageInstance = (obj: any): obj is AsyncStorageType => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Check for required AsyncStorage methods / 필수 AsyncStorage 메서드 확인
  // AsyncStorage는 static 메서드들을 가진 객체이므로 직접 호출 가능 / AsyncStorage is an object with static methods, so they can be called directly
  const hasRequiredMethods =
    typeof obj.getItem === 'function' &&
    typeof obj.setItem === 'function' &&
    typeof obj.removeItem === 'function' &&
    typeof obj.getAllKeys === 'function' &&
    typeof obj.clear === 'function' &&
    typeof obj.multiGet === 'function' &&
    typeof obj.multiSet === 'function';

  // Check if it's NOT a plain object with string keys (Record) / 문자열 키를 가진 일반 객체(Record)가 아닌지 확인
  // AsyncStorage는 일반적으로 default export이므로, Object.keys()로 얻은 키들이 메서드 이름들일 것입니다 / AsyncStorage is typically a default export, so keys from Object.keys() would be method names
  // 하지만 Record는 일반적으로 데이터 키들을 가지고 있습니다 / But Record typically has data keys
  // 더 정확한 방법: AsyncStorage는 constructor가 없거나 특정 형태를 가집니다 / More accurate: AsyncStorage has no constructor or specific shape
  const keys = Object.keys(obj);
  const isPlainObject = keys.length > 0 && keys.every((key) => typeof obj[key] !== 'function');

  return hasRequiredMethods && !isPlainObject;
};

/**
 * Normalize storages config property / 스토리지 설정 속성 정규화
 * Converts array to record format / 배열을 레코드 형식으로 변환
 * For AsyncStorage, we only support the default instance / AsyncStorage의 경우 기본 인스턴스만 지원
 */
export const normalizeStoragesConfigProperty = (
  storage: AsyncStorageType | Record<string, AsyncStorageType>
): Record<string, AsyncStorageType> => {
  // Single instance (default AsyncStorage) / 단일 인스턴스 (기본 AsyncStorage)
  if (isAsyncStorageInstance(storage)) {
    return { default: storage };
  }

  // Record / 레코드
  if (typeof storage === 'object' && storage !== null) {
    // Validate all values are AsyncStorage instances / 모든 값이 AsyncStorage 인스턴스인지 검증
    const normalized: Record<string, AsyncStorageType> = {};
    for (const [key, value] of Object.entries(storage)) {
      if (isAsyncStorageInstance(value)) {
        normalized[key] = value;
      } else {
        console.warn(
          `[AsyncStorageDevTools] Invalid AsyncStorage instance for key "${key}". Skipping. / 키 "${key}"에 대한 유효하지 않은 AsyncStorage 인스턴스입니다. 건너뜁니다.`
        );
      }
    }
    return normalized;
  }

  // Fallback / 폴백
  console.warn(
    '[AsyncStorageDevTools] Invalid storage configuration. Expected AsyncStorage instance or Record<string, AsyncStorage>. / 유효하지 않은 스토리지 설정입니다. AsyncStorage 인스턴스 또는 Record<string, AsyncStorage>가 필요합니다.'
  );
  return {};
};
