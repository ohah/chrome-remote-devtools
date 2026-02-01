# React DevTools Components & Profiler 연동

이 가이드는 **React DevTools Components** 및 **Profiler** 패널을 이 프로젝트에 추가하여 React Native 클라이언트와 연동하는 방법을 설명합니다. 참조 구현은 `reference/react-native-devtools-frontend`와 동일한 방식입니다.

## 개요

참조 구현에서는 다음을 사용합니다:

1. **프론트엔드 (DevTools UI)**
   - `panels/react_devtools/` — Components 및 Profiler 뷰
   - `models/react_native/ReactDevToolsBindingsModel.ts` — CDP Runtime(addBinding + evaluate)으로 메시지 송수신
   - `third_party/react-devtools/` — [facebook/react react-devtools-fusebox](https://github.com/facebook/react/tree/main/packages/react-devtools-fusebox)의 React DevTools UI(브리지, 스토어, `initializeComponents`, `initializeProfiler`)

2. **백엔드 (RN 앱)**
   - 전역 디스패처(예: `__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__`):
     - CDP `Runtime.addBinding`용 `BINDING_NAME` 노출
     - `sendMessage(domain, payload)` 구현 (프론트엔드가 `Runtime.evaluate`로 호출)
     - `initializeDomain(domain)` 구현 (프론트엔드가 호출)
     - CDP 바인딩을 호출하여 프론트엔드로 메시지 전송 (프론트엔드가 `Runtime.bindingCalled` 수신)
   - **React DevTools 백엔드**는 RN JS 컨텍스트에서 실행되며 이 디스패처와 통신

우리 스택에는 이미 **WebSocket 기반 CDP**와 **Runtime**(evaluate, addBinding, BindingCalled)이 있습니다. 부족한 부분은:

- 프론트엔드 패널 + 모델 + third_party 번들
- RN 측 디스패처 + React DevTools 백엔드

---

## Step 1: 프론트엔드 — 패널, 모델, third_party 복사

`reference/react-native-devtools-frontend/front_end/`에서 아래 항목을 `devtools/devtools-frontend/front_end/`로 복사합니다:

| 출처 (reference)              | 대상 (devtools-frontend)      |
| ----------------------------- | ----------------------------- |
| `panels/react_devtools/`      | `panels/react_devtools/`      |
| `models/react_native/`        | `models/react_native/`        |
| `third_party/react-devtools/` | `third_party/react-devtools/` |

- 라이선스 헤더(Chromium 및 Meta 해당 시) 유지
- 프로젝트가 다른 빌드(Nice-PLQ, BUILD.gn 없음 등)를 쓸 수 있음. BUILD.gn을 쓰면 새 모듈을 추가하고, 그렇지 않으면 엔트리포인트와 meta 파일이 로드되도록 설정

---

## Step 2: 프론트엔드 — 패널 등록 및 clientType 조건 추가

1. **앱 엔트리포인트에서 패널 등록**  
   `devtools/devtools-frontend/front_end/entrypoints/devtools_app/devtools_app.ts`에 추가:

   ```ts
   import '../../panels/react_devtools/react_devtools_components-meta.js';
   import '../../panels/react_devtools/react_devtools_profiler-meta.js';
   ```

2. **React Native일 때만 패널 표시**  
   `react_devtools_components-meta.ts`와 `react_devtools_profiler-meta.ts`에서, `storage-meta.ts` / `redux-meta.ts`와 동일한 패턴으로 뷰 등록 시 조건 추가:

   ```ts
   UI.ViewManager.registerViewExtension({
     // ... id, title 등
     condition: () => Root.Runtime.Runtime.queryParam('clientType') === 'react-native',
     async loadView() { ... },
   });
   ```

3. **ReactDevToolsBindingsModel 등록**  
   모델은 `ReactDevToolsModel.ts`와 `ReactDevToolsBindingsModel.ts`에서 이미 `SDK.SDKModel.SDKModel.register(..., { autostart: false })`로 등록됨. 패널이 열리고 타깃에 bindings 모델이 있을 때 생성됨. `ReactDevToolsBindingsModel`이 등록되어 있고 타깃에 `RuntimeModel`이 있는지 확인 (CDP Runtime은 이미 사용 중)

---

## Step 3: 백엔드 (RN 앱) — 디스패처 + React DevTools 백엔드

프론트엔드는 RN 앱이 CDP Runtime을 사용하는 **디스패처**를 노출할 것을 기대합니다:

- 프론트엔드는 `Runtime.addBinding(bindingName)` 및 `Runtime.evaluate(__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__.sendMessage('react-devtools', json))`로 메시지 전송
- RN 앱은 바인딩을 호출해 응답 메시지를 보내고, 프론트엔드는 `Runtime.bindingCalled`로 수신

RN 측에서는 다음이 필요합니다:

1. **React DevTools 백엔드** — JS 컨텍스트에서 실행 (예: `react-devtools-inline`, `react-devtools-core` 또는 Fusebox와 동일한 백엔드)
2. **전역 디스패처** (예: `__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__` 또는 일관된 이름):
   - `BINDING_NAME` — addBinding에 사용하는 문자열
   - `initializeDomain(domain)` — 프론트엔드가 호출; 백엔드와 연결
   - `sendMessage(domain, serializedMessage)` — 프론트엔드가 evaluate로 호출; JSON 파싱 후 백엔드로 전달
   - 백엔드가 프론트엔드로 보낼 메시지가 있으면, `{ domain: 'react-devtools', message: ... }` 형태의 payload로 CDP 바인딩(BINDING_NAME과 동일) 호출
3. **CDP Runtime 연동**  
   `react-native-inspector`(또는 CDP를 처리하는 레이어)는:
   - `Runtime.addBinding`을 처리하고 바인딩 이름 저장
   - 앱이 해당 바인딩(노출한 전역 함수 등)을 호출하면 CDP `Runtime.bindingCalled` 이벤트를 프론트엔드로 전송
   - `Runtime.evaluate`를 처리하고 JS 컨텍스트에서 `__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__.sendMessage(...)` / `initializeDomain(...)` 실행

현재 **`packages/react-native-inspector`는 이를 구현하지 않습니다**. 다음을 할 수 있습니다:

- react-native-inspector에 새 CDP 도메인 또는 Runtime 훅 추가:
  - 디스패처 객체와 React DevTools 백엔드를 앱 번들에 주입(또는 inspector 연결 시 로드)
  - addBinding + bindingCalled 및 evaluate를 구현해 프론트엔드의 `ReactDevToolsBindingsModel`이 변경 없이 동작하도록 함
- 또는 참조 RN/Fusebox 앱과 동일한 방식 재사용: 앱(또는 별도 연동 패키지)이 디스패처와 백엔드를 주입하고, CDP 중계가 Runtime.addBinding 및 BindingCalled를 지원하는지 확인

---

## Step 4: third_party/react-devtools 소스

참조의 `third_party/react-devtools/`는 [facebook/react packages/react-devtools-fusebox](https://github.com/facebook/react/tree/main/packages/react-devtools-fusebox)에서 옵니다. 참조 README 기준:

1. [react](https://github.com/facebook/react) 클론 후 `packages/react-devtools-fusebox`에서 `yarn build` 실행
2. 빌드 결과를 `front_end/third_party/react-devtools/package/`에 복사

또는 참조의 `reference/react-native-devtools-frontend/front_end/third_party/react-devtools/`에서 기존 `package/`(및 `react-devtools.ts`, `README.md`)를 복사해 프론트엔드에 `createBridge`, `createStore`, `initializeComponents`, `initializeProfiler` 및 CSS를 갖추면 됩니다.

---

## 요약 체크리스트

| 레이어                             | 작업                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **devtools-frontend**              | 참조에서 `panels/react_devtools/`, `models/react_native/`, `third_party/react-devtools/` 복사                                      |
| **devtools_app**                   | `react_devtools_components-meta.js`, `react_devtools_profiler-meta.js` import                                                      |
| **react_devtools \*-meta.ts**      | `condition: () => queryParam('clientType') === 'react-native'` 추가                                                                |
| **Build/config**                   | 빌드에 새 모듈 추가 (BUILD.gn 또는 번들러 엔트리포인트)                                                                            |
| **RN 앱 / react-native-inspector** | 전역 디스패처 + React DevTools 백엔드 구현; Runtime.addBinding 및 bindingCalled 처리; sendMessage/initializeDomain용 evaluate 지원 |
| **third_party/react-devtools**     | 참조 복사본 사용 또는 react 저장소 react-devtools-fusebox에서 빌드                                                                 |

RN 측이 참조와 동일한 디스패처 + 바인딩 계약을 노출하면, 기존 `ReactDevToolsBindingsModel`과 패널은 최소 변경으로 동작해야 합니다.

---

## 구현 상태 및 수정 사항

다음이 적용되면 렌더링과 기능이 동작합니다:

1. **react-native-inspector**
   - **Runtime.evaluate**는 **표현식 값**을 반환해야 함 (예: `globalThis.__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ != undefined` → `true`/`false`). 프론트엔드가 폴링하며, `undefined`를 반환하면 타임아웃과 빈 패널이 발생함. `(0, eval)(expr)` 등으로 표현식 결과를 반환할 것.
   - **Runtime.addBinding** 및 **Runtime.bindingCalled**: 바인딩 이름 등록·처리; 앱이 바인딩을 호출하면 CDP `Runtime.bindingCalled` 이벤트 전송.

2. **Inspector**
   - DevTools iframe URL에 **clientId**(및 **clientType**)를 넘겨, 패널 조건(`clientType === 'react-native'` 또는 `clientId.startsWith('rn-inspector-')`)으로 RN 클라이언트일 때 Components/Profiler 탭이 보이도록 함.

3. **DevTools iframe (CSP)**
   - third_party React DevTools 번들은 `new Function()` 및 `new Worker(URL.createObjectURL(new Blob([...])))`를 사용함. 엔트리포인트 HTML CSP에 추가:
     - **script-src**: `'unsafe-eval'`, `blob:`
     - **worker-src**: `'self'`, `blob:`
   - 그렇지 않으면 `EvalError: Refused to evaluate...` 또는 `SecurityError: The operation is insecure` 발생.

4. **React DevTools 패널 CSS**
   - `#clearView()`가 `registerRequiredCSS(ReactDevTools.CSS)`로 주입한 `<style>`을 제거하면 안 됨. **콘텐츠 래퍼** div 사용: `contentElement`에는 래퍼만 append, `#clearView()`에서는 래퍼만 clear하고, `initializeComponents` / `initializeProfiler`에는 래퍼를 넘김. `<style>`은 래퍼와 형제로 두어 제거되지 않도록 함.
