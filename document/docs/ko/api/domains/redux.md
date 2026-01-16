# Redux Domain

Redux 도메인은 React Native 앱의 Redux 상태 변경 및 액션을 추적하는 커스텀 CDP 도메인입니다.

## 개요

Redux 도메인은 Redux DevTools Extension과의 통합을 제공하여 Redux 애플리케이션을 디버깅할 수 있게 해줍니다. Redux 액션과 상태 변경을 CDP 메시지로 전송하여 DevTools의 Redux 패널에서 확인할 수 있습니다.

## Methods

### Redux.message

애플리케이션에서 DevTools로 또는 그 반대로 Redux 메시지를 전송합니다. 이는 모든 Redux 메시지 타입을 처리하는 통합 메서드입니다. Redux DevTools Extension 메시지 형식과 정확히 일치합니다.

**Parameters:**

- `type` (MessageType): 메시지 타입
  - `INIT_INSTANCE`: Redux 인스턴스 초기화
  - `INIT`: 스토어 초기화
  - `ACTION`: 액션 디스패치
  - `STATE`: 상태 업데이트
  - `ERROR`: 에러 발생
- `action` (string, optional): 액션 페이로드 (JSON 문자열, ACTION 타입용)
- `payload` (string, optional): 상태 페이로드 (JSON 문자열, INIT 및 ACTION 타입용)
- `source` (string): 메시지 소스 (예: "@devtools-page", "@devtools-extension")
- `instanceId` (string): Redux 스토어의 인스턴스 ID
- `name` (string, optional): 스토어 이름 (INIT 타입용)
- `maxAge` (integer, optional): 유지할 액션의 최대 나이 (ACTION 타입용)
- `nextActionId` (integer, optional): 다음 액션 ID (ACTION 타입용)
- `error` (string, optional): 에러 메시지 (ERROR 타입용)
- `timestamp` (Runtime.Timestamp, optional): 메시지가 생성된 타임스탬프

## Events

### Redux.message

애플리케이션에서 Redux 메시지를 받았을 때 발생합니다. Redux DevTools Extension 메시지 형식과 정확히 일치합니다.

**Parameters:**

- `type` (MessageType): 메시지 타입
- `action` (string, optional): 액션 페이로드 (JSON 문자열, ACTION 타입용)
- `payload` (string, optional): 상태 페이로드 (JSON 문자열, INIT 및 ACTION 타입용)
- `source` (string): 메시지 소스
- `instanceId` (string): Redux 스토어의 인스턴스 ID
- `name` (string, optional): 스토어 이름 (INIT 타입용)
- `maxAge` (integer, optional): 유지할 액션의 최대 나이 (ACTION 타입용)
- `nextActionId` (integer, optional): 다음 액션 ID (ACTION 타입용)
- `error` (string, optional): 에러 메시지 (ERROR 타입용)
- `timestamp` (Runtime.Timestamp, optional): 메시지가 생성된 타임스탬프

## 사용법

### React Native

React Native 앱에서 Redux DevTools를 사용하려면:

```typescript
import { createReduxDevToolsMiddleware } from '@ohah/chrome-remote-devtools-react-native/redux';
import { createStore, applyMiddleware } from 'redux';
import rootReducer from './reducers';

const store = createStore(
  rootReducer,
  applyMiddleware(
    createReduxDevToolsMiddleware({
      name: 'MyApp',
      instanceId: 'main-store'
    })
  )
);
```

### Zustand

Zustand와 함께 사용하려면:

```typescript
import { chromeDevtools } from '@ohah/chrome-remote-devtools-react-native/zustand';
import { create } from 'zustand';

const useStore = create(
  chromeDevtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    { name: 'MyStore', instanceId: 'main-store' }
  )
);
```

### Metro 설정

Metro 설정에 Redux DevTools Extension polyfill을 추가해야 합니다:

```javascript
// metro.config.js
const { withChromeRemoteDevToolsRedux } = require('@ohah/chrome-remote-devtools-react-native/metro');

module.exports = withChromeRemoteDevToolsRedux(metroConfig);
```

## 메시지 타입

### INIT_INSTANCE

새로운 Redux 인스턴스가 초기화될 때 전송됩니다. DevTools에 새로운 스토어 인스턴스를 알립니다.

### INIT

스토어가 초기화될 때 전송됩니다. 초기 상태와 스토어 메타데이터를 포함합니다.

### ACTION

액션이 디스패치될 때 전송됩니다. 액션 타입과 페이로드를 포함합니다.

### STATE

상태가 변경될 때 전송됩니다. 새로운 상태를 포함합니다.

### ERROR

에러가 발생했을 때 전송됩니다. 에러 메시지를 포함합니다.

## 참고사항

- Redux 도메인은 React Native 전용 커스텀 CDP 도메인입니다.
- Redux DevTools Extension 형식과 완전히 호환됩니다.
- 여러 Redux 스토어 인스턴스를 동시에 추적할 수 있습니다.
- `__REDUX_DEVTOOLS_EXTENSION__`이 자동으로 주입되어 Redux DevTools Extension API와 호환됩니다.
