# AsyncStorageStorage Domain

AsyncStorageStorage 도메인은 React Native 앱의 AsyncStorage를 검사하고 수정하는 커스텀 CDP 도메인입니다.

## 개요

AsyncStorageStorage 도메인은 React Native에서 사용하는 AsyncStorage 인스턴스를 Chrome DevTools에서 검사하고 수정할 수 있게 해줍니다.

## Methods

### AsyncStorageStorage.enable

AsyncStorageStorage 도메인을 활성화합니다. 활성화되면 등록된 모든 AsyncStorage 인스턴스의 스냅샷이 자동으로 전송됩니다.

### AsyncStorageStorage.getAsyncStorageItems

AsyncStorage 인스턴스의 모든 항목을 가져옵니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID

**Returns:**

- `entries`: 항목 배열 (각 항목은 `[key, value]` 형태의 문자열 배열)

### AsyncStorageStorage.setAsyncStorageItem

AsyncStorage 인스턴스에 항목을 설정합니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID
- `key` (string): 키
- `value` (string): 값 (AsyncStorage는 문자열만 저장합니다)

### AsyncStorageStorage.removeAsyncStorageItem

AsyncStorage 인스턴스에서 항목을 제거합니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID
- `key` (string): 제거할 키

### AsyncStorageStorage.clear

AsyncStorage 인스턴스의 모든 항목을 제거합니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID

## Events

### AsyncStorageStorage.asyncStorageInstanceCreated

AsyncStorage 인스턴스가 생성되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID

### AsyncStorageStorage.asyncStorageItemAdded

AsyncStorage 항목이 추가되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID
- `key` (string): 키
- `newValue` (string): 새 값

### AsyncStorageStorage.asyncStorageItemUpdated

AsyncStorage 항목이 업데이트되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID
- `key` (string): 키
- `oldValue` (string): 이전 값
- `newValue` (string): 새 값

### AsyncStorageStorage.asyncStorageItemRemoved

AsyncStorage 항목이 제거되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID
- `key` (string): 제거된 키

### AsyncStorageStorage.asyncStorageItemsCleared

AsyncStorage 인스턴스의 모든 항목이 제거되었을 때 발생합니다.

**Parameters:**

- `instanceId` (string): AsyncStorage 인스턴스 ID

## 사용법

React Native 앱에서 AsyncStorage 인스턴스를 등록하려면:

```typescript
import { registerAsyncStorageDevTools } from '@ohah/chrome-remote-devtools-inspector-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 기본 AsyncStorage 인스턴스 등록
registerAsyncStorageDevTools(AsyncStorage);

// 여러 인스턴스 등록 (커스텀 AsyncStorage가 있는 경우)
registerAsyncStorageDevTools({
  'default': AsyncStorage,
  'custom': customAsyncStorage,
});

// 블랙리스트 패턴 사용 (선택사항)
registerAsyncStorageDevTools(AsyncStorage, /^_/); // '_'로 시작하는 키 제외
```

## 참고사항

- AsyncStorageStorage 도메인은 React Native 전용 커스텀 CDP 도메인입니다.
- AsyncStorage 인스턴스는 `registerAsyncStorageDevTools()`를 호출하여 등록해야 DevTools에서 검사할 수 있습니다.
- AsyncStorage는 문자열만 저장하므로 모든 값은 문자열로 전송됩니다.
- AsyncStorage의 모든 메서드(setItem, removeItem, clear, multiSet, multiRemove, multiMerge)가 자동으로 훅되어 변경사항을 감지합니다.
