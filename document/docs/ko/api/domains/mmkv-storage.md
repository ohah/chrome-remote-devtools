# MMKVStorage Domain

MMKVStorage 도메인은 React Native 앱의 MMKV 스토리지를 검사하고 수정하는 커스텀 CDP 도메인입니다.

## 개요

MMKVStorage 도메인은 React Native에서 사용하는 MMKV (Memory-Mapped Key-Value) 스토리지 인스턴스를 Chrome DevTools에서 검사하고 수정할 수 있게 해줍니다.

## Methods

### MMKVStorage.enable

MMKVStorage 도메인을 활성화합니다. 활성화되면 등록된 모든 MMKV 인스턴스의 스냅샷이 자동으로 전송됩니다.

### MMKVStorage.getMMKVItems

MMKV 인스턴스의 모든 항목을 가져옵니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID

**Returns:**

- `entries`: 항목 배열 (각 항목은 `[key, value]` 형태의 문자열 배열)

### MMKVStorage.setMMKVItem

MMKV 인스턴스에 항목을 설정합니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID
- `key` (string): 키
- `value` (string): 값 (문자열로 전달되며, 숫자나 불린 값은 자동으로 변환됩니다)

### MMKVStorage.removeMMKVItem

MMKV 인스턴스에서 항목을 제거합니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID
- `key` (string): 제거할 키

### MMKVStorage.clear

MMKV 인스턴스의 모든 항목을 제거합니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID

## Events

### MMKVStorage.mmkvInstanceCreated

MMKV 인스턴스가 생성되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID

### MMKVStorage.mmkvItemAdded

MMKV 항목이 추가되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID
- `key` (string): 키
- `newValue` (string): 새 값

### MMKVStorage.mmkvItemUpdated

MMKV 항목이 업데이트되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID
- `key` (string): 키
- `oldValue` (string): 이전 값
- `newValue` (string): 새 값

### MMKVStorage.mmkvItemRemoved

MMKV 항목이 제거되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID
- `key` (string): 제거된 키

### MMKVStorage.mmkvItemsCleared

MMKV 인스턴스의 모든 항목이 제거되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): MMKV 인스턴스 ID

## 사용법

React Native 앱에서 MMKV 인스턴스를 등록하려면:

```typescript
import { registerMMKVDevTools } from '@ohah/chrome-remote-devtools-react-native';
import { createMMKV } from 'react-native-mmkv';

const userStorage = createMMKV({ id: 'user-storage' });
const cacheStorage = createMMKV({ id: 'cache-storage' });

// 단일 인스턴스 등록
registerMMKVDevTools(userStorage);

// 여러 인스턴스 등록
registerMMKVDevTools({
  'user-storage': userStorage,
  'cache-storage': cacheStorage,
});

// 블랙리스트 패턴 사용 (선택사항)
registerMMKVDevTools(userStorage, /^_/); // '_'로 시작하는 키 제외
```

## 참고사항

- MMKVStorage 도메인은 React Native 전용 커스텀 CDP 도메인입니다.
- MMKV 인스턴스는 `registerMMKVDevTools()`를 호출하여 등록해야 DevTools에서 검사할 수 있습니다.
- 값은 문자열로 전송되며, 숫자나 불린 값은 자동으로 변환됩니다.
